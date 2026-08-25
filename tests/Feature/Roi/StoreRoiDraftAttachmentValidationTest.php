<?php

namespace Tests\Feature\Roi;

use App\Models\RoiEntryProject; 
use App\Models\User;          
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Tests\TestCase;

/**
 * Regression tests for the "total attachments count < 1" bug.
 *
 * Covers:
 *  - Fix 3 (StoreRoiDraftRequest::passedValidation): omitted vs explicit
 *    entryRemarks.attachments must not be conflated.
 *
 * NOTE: These assume the yield thresholds that trigger the attachment
 * requirement are monoAmvpYields.monthly > 4000 or colorAmvpYields.monthly > 2000,
 * per the current passedValidation() rule. 
 */
class StoreRoiDraftAttachmentValidationTest extends TestCase
{
    use RefreshDatabase;

    protected function highYieldPayload(array $overrides = []): array
    {
        return array_merge([
            'companyInfo' => [
                'companyName' => 'Test Co',
                'contractYears' => 1,
                'contractType' => 'New',
            ],
            'yield' => [
                'monoAmvpYields' => ['monthly' => 5000], // triggers attachment requirement
                'colorAmvpYields' => ['monthly' => 0],
            ],
            'entryRemarks' => [
                'remarks' => 'High volume usage, see attached breakdown.',
                // 'attachments' intentionally omitted per test case below
            ],
        ], $overrides);
    }

    /** @test */
    public function submit_omitting_attachments_field_falls_back_to_persisted_attachments()
    {
        $user = User::factory()->create();

        // Project already has one persisted attachment from a prior save.
        $project = RoiEntryProject::factory()->create([
            'user_id' => $user->id,
            'entry_remarks_attachments' => [
                [
                    'id' => 'att-existing-1',
                    'original_name' => 'invoice.pdf',
                    'stored_name' => 'stored-invoice.pdf',
                    'path' => 'roi/attachments/stored-invoice.pdf',
                    'size' => 12345,
                ],
            ],
        ]);

        $payload = $this->highYieldPayload();
        // entryRemarks.attachments is NOT present at all in this payload —
        // simulates a submit where the client didn't re-send existing
        // attachment metadata.
        unset($payload['entryRemarks']['attachments']);

        $response = $this->actingAs($user)
            ->patch(route('roi.entry.projects.submit', $project) . '?_method=PATCH', $payload);

        // Should NOT fail attachment validation — persisted attachment
        // should be counted via the route-bound $project fallback.
        $response->assertSessionHasNoErrors();
    }

    /** @test */
    public function submit_with_explicit_empty_attachments_array_still_fails_validation()
    {
        $user = User::factory()->create();

        $project = RoiEntryProject::factory()->create([
            'user_id' => $user->id,
            'entry_remarks_attachments' => [
                [
                    'id' => 'att-existing-1',
                    'original_name' => 'invoice.pdf',
                    'stored_name' => 'stored-invoice.pdf',
                    'path' => 'roi/attachments/stored-invoice.pdf',
                    'size' => 12345,
                ],
            ],
        ]);

        $payload = $this->highYieldPayload([
            'entryRemarks' => [
                'remarks' => 'Removing all attachments intentionally.',
                'attachments' => [], // explicit "user removed everything"
            ],
        ]);

        $response = $this->actingAs($user)
            ->patch(route('roi.entry.projects.submit', $project) . '?_method=PATCH', $payload);

        // Explicit [] must NOT fall back to persisted state — removal
        // should be honored, so validation should fail (no new file either).
        $response->assertSessionHasErrors('entry_remarks_attachments');
    }

    /** @test */
    public function submit_with_kept_attachment_id_in_request_passes_without_double_counting()
    {
        $user = User::factory()->create();

        $project = RoiEntryProject::factory()->create([
            'user_id' => $user->id,
            'entry_remarks_attachments' => [
                [
                    'id' => 'att-existing-1',
                    'original_name' => 'invoice.pdf',
                    'stored_name' => 'stored-invoice.pdf',
                    'path' => 'roi/attachments/stored-invoice.pdf',
                    'size' => 12345,
                ],
            ],
        ]);

        $payload = $this->highYieldPayload([
            'entryRemarks' => [
                'remarks' => 'Keeping existing attachment.',
                'attachments' => [
                    [
                        'id' => 'att-existing-1',
                        'original_name' => 'invoice.pdf',
                        'stored_name' => 'stored-invoice.pdf',
                        'path' => 'roi/attachments/stored-invoice.pdf',
                        'size' => 12345,
                    ],
                ],
            ],
        ]);

        $response = $this->actingAs($user)
            ->patch(route('roi.entry.projects.submit', $project) . '?_method=PATCH', $payload);

        $response->assertSessionHasNoErrors();
        // Regression guard: count should be exactly 1, not 2 (request + DB).
        // If persistDraftData() re-persists entry_remarks_attachments, assert
        // the stored array still has exactly one entry here as well:
        $this->assertCount(1, $project->fresh()->entry_remarks_attachments);
    }

    /** @test */
    public function save_draft_new_project_omitting_attachments_fails_when_no_project_id_yet()
    {
        $user = User::factory()->create();

        $payload = $this->highYieldPayload([
            'metadata' => ['projectId' => null], // brand-new draft, nothing persisted yet
        ]);
        unset($payload['entryRemarks']['attachments']);

        $response = $this->actingAs($user)
            ->post(route('roi.entry.draft.save'), $payload);

        // No project to fall back to → correctly fails (nothing exists yet).
        $response->assertSessionHasErrors('entry_remarks_attachments');
    }

    /** @test */
    public function save_draft_existing_project_omitting_attachments_falls_back_via_metadata_project_id()
    {
        $user = User::factory()->create();

        $project = RoiEntryProject::factory()->create([
            'user_id' => $user->id,
            'entry_remarks_attachments' => [
                [
                    'id' => 'att-existing-1',
                    'original_name' => 'invoice.pdf',
                    'stored_name' => 'stored-invoice.pdf',
                    'path' => 'roi/attachments/stored-invoice.pdf',
                    'size' => 12345,
                ],
            ],
        ]);

        $payload = $this->highYieldPayload([
            'metadata' => ['projectId' => $project->id],
            'companyInfo' => [
                'companyName' => 'Test Co',
                'contractYears' => 1,
                'contractType' => 'New',
                'type' => 0,
            ],
        ]);
        unset($payload['entryRemarks']['attachments']);

        $response = $this->actingAs($user)
            ->post(route('roi.entry.draft.save'), $payload);

        // saveDraft route has no {project} binding — must resolve via
        // metadata.projectId fallback instead of $this->route('project').
        $response->assertSessionHasNoErrors();
    }

    /** @test */
    public function new_file_upload_alone_satisfies_validation_without_kept_attachments()
    {
        $user = User::factory()->create();

        $project = RoiEntryProject::factory()->create([
            'user_id' => $user->id,
            'entry_remarks_attachments' => [],
        ]);

        $payload = $this->highYieldPayload([
            'entryRemarks' => [
                'remarks' => 'Adding a brand new file.',
                'attachments' => [],
            ],
        ]);
        $payload['entry_remarks_attachments'] = [
            UploadedFile::fake()->create('new-file.pdf', 500, 'application/pdf'),
        ];

        $response = $this->actingAs($user)
            ->patch(route('roi.entry.projects.submit', $project) . '?_method=PATCH', $payload);

        $response->assertSessionHasNoErrors();
    }
}