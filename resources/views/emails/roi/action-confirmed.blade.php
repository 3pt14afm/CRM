<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Action Confirmed for ROI {{ $reference }}</title>
</head>
<body>

<p>You have successfully <strong>{{ $actionTaken }}</strong> ROI proposal <strong>{{ $reference }}</strong>.</p>

<p>
    <strong>New Status:</strong> {{ $newStatus }}<br>
    <strong>Routed To:</strong> {{ $routedTo }}
</p>


<p><a href="{{ $projectUrl }}">Click here to view the project</a></p>

<hr>

<p><em><small>This is a system-generated notification. Please do not reply to this email.</small></em></p>

</body>
</html>