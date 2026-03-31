<?php

namespace App\Http\Controllers;

use App\Models\PrinterModel;
use App\Models\RoiChatSession;
use App\Services\RoiChatService;
use Illuminate\Http\Request;

class RoiChatController extends Controller
{
    public function message(Request $request, RoiChatService $chatService)
    {
        $request->validate([
            'message' => 'nullable|string',
            'printer_model_id' => 'nullable|integer|exists:printer_models,id',
        ]);

        $input = $request->message;
        $displayMessage = $input;

        if ($request->filled('printer_model_id')) {
            $printer = PrinterModel::find($request->printer_model_id);

            if (!$printer) {
                return back();
            }

            $input = (string) $printer->id;
            $displayMessage = $printer->printer_name;
        }

        if (!filled($input)) {
            return back();
        }

        $user = $request->user();

        $session = RoiChatSession::firstOrCreate(
            ['user_id' => $user->id],
            [
                'stage' => 'collecting',
                'state' => [],
            ]
        );

        $session->messages()->create([
            'role' => 'user',
            'content' => $displayMessage,
        ]);

        $result = $chatService->handle($session, $input);

        $session->messages()->create([
            'role' => 'assistant',
            'content' => $result['reply'],
        ]);

      if (!empty($result['redirect'])) {
        return redirect()
            ->to($result['redirect'])
            ->with('success', 'Draft created successfully.');
    }
        return back();
    }

    public function reset(Request $request)
    {
        $user = $request->user();

        RoiChatSession::where('user_id', $user->id)->delete();

        return back();
    }
}