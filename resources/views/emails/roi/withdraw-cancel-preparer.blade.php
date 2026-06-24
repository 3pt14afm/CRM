<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ROI Proposal {{ $actionType }} – {{ $reference }}</title>
</head>
<body>

<p>
    <strong>Status:</strong> 
    @if ($actionType === 'Withdrawn')
        Draft
    @else
        Cancelled and Archived
    @endif
</p>

@if ($actionType === 'Withdrawn')
    <p>It has been returned to your entry queue so you can edit and resubmit.</p>
    <p><a href="{{ $projectUrl }}">Click here to view the project</a></p>
@else
    <p>This proposal is now archived. No further action is required.</p>
@endif

<hr>

<p><em><small>This is a system-generated notification. Please do not reply to this email.</small></em></p>

</body>
</html>