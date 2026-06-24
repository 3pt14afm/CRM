<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ROI {{ $reference }} Returned to Previous Stage</title>
</head>
<body>

<p>
    <strong>Returned By:</strong> {{ $higherActorName }}<br>
    <strong>Returned To:</strong> {{ $lowerActorName }} ({{ $currentStatus }})
</p>

<p>
    <strong>Reason / Feedback:</strong><br>
    <em>"{{ $comment }}"</em>
</p>

<p><a href="{{ $projectUrl }}">Click here to view the project</a></p>

<hr>

<p><em><small>This is a system-generated notification. Please do not reply to this email.</small></em></p>

</body>
</html>