<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ROI Proposal {{ $reference }} Disapproved</title>
</head>
<body>


<p>Your ROI proposal <strong>{{ $reference }}</strong> has been <strong>Disapproved</strong> by <strong>{{ $actorName }}</strong>.</p>

<ul>
    <li>Current Status: Disapproved</li>
    <li>Rejection Stage: {{ $stageOfRejection }}</li>
</ul>

<p><a href="{{ $projectUrl }}">Click here to view the project</a></p>

<hr>

<p><em><small>This is a system-generated notification. Please do not reply to this email.</small></em></p>

</body>
</html>