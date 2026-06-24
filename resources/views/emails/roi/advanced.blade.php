<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ROI {{ $reference }} is now {{ $nextStatus }}</title>
</head>
<body>

<p>Your ROI proposal <strong>{{ $reference }}</strong> has been successfully <strong>{{ $actionTaken }}</strong> by <strong>{{ $actorName }}</strong>.</p>

<p>
    <strong>Current Status:</strong> {{ $nextStatus }}<br>
    @if ($nextActorName !== 'N/A')
    <strong>Assigned To:</strong> {{ $nextActorName }}
    @endif
</p>

<p><a href="{{ $projectUrl }}">Click here to view the project</a></p>

<hr>

<p><em><small>This is a system-generated notification. Please do not reply to this email.</small></em></p>

</body>
</html>