<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ROI {{ $reference }} Returned for Revision</title>
</head>
<body>

<p>Your ROI proposal <strong>{{ $reference }}</strong> has been <strong>Returned</strong> by <strong>{{ $reviewerName }}</strong> (Reviewer).</p>

<li>Current Status: Returned / Draft</li>

<p><strong>Required Revisions / Feedback:</strong></p>
<p>"{{ $comment }}"</p>

<p><a href="{{ $projectUrl }}">Click here to view the project</a></p>

<hr>

<p><em><small>This is a system-generated notification. Please do not reply to this email.</small></em></p>

</body>
</html>