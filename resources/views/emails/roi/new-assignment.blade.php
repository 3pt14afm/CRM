<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body>

<p>ROI <strong>{{ $project->reference }}</strong> has been forwarded by <strong>{{ $actorName }}</strong> and is ready for you to <strong>{{ $requiredAction }}</strong>.</p>

<p><a href="{{ $projectUrl }}">Click here to view the project</a></p>

<br>
<p><em><small>This is a system-generated notification. Please do not reply to this email.</small></em></p>

</body>
</html>