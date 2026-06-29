@if ($type === 'submitted')
    <p>Your SPRF proposal <strong>{{ $referenceNo }}</strong> has been submitted and is currently with <strong>{{ $data['approverName'] }} ({{ $data['approverRole'] }})</strong> for review.</p>
    <p><a href="{{ $projectLink }}">Click here to view the project</a></p>

@elseif ($type === 'advanced')
    <p>Your SPRF proposal <strong>{{ $referenceNo }}</strong> has been successfully {{ $data['action'] }} by {{ $data['approverName'] }}.</p>
    <p><strong>Status: </strong>{{ $data['statusDetail'] }}</p>
    <p><a href="{{ $projectLink }}">Click here to view the project</a></p>

@elseif ($type === 'rejected')
    <p>Your SPRF proposal <strong>{{ $referenceNo }}</strong> has been disapproved by {{ $data['rejectorName'] }}.</p>
    <ul>
        <li>Status: Disapproved</li>
        <li>Routed To: System Archive</li>
    </ul>
    <p><a href="{{ $projectLink }}">Click here to view the project</a></p>

@elseif ($type === 'returned')
    <p>Your SPRF proposal <strong>{{ $referenceNo }}</strong> has been returned by {{ $data['approverName'] }}.</p>
    <p><strong>Status: Returned / Draft</strong></p>
    <p><a href="{{ $projectLink }}">Click here to view the project</a></p>

@elseif ($type === 'withdrawn')
    <p>Your SPRF proposal <strong>{{ $referenceNo }}</strong> has been returned to your draft queue. You can now edit and resubmit. </p>
    <p><strong>Status: Draft</strong></p>

@elseif ($type === 'cancelled')
    <p>Your SPRF proposal <strong>{{ $referenceNo }}</strong> has been cancelled and is now archived.</p>
    <p><strong>Status: Cancelled & Archived</strong></p>
    <p><a href="{{ $projectLink }}">Click here to view the project</a></p>

@elseif ($type === 'sent_back_inform')
    <p>Your SPRF proposal <strong>{{ $referenceNo }}</strong> has been returned by <strong>{{ $data['actorName'] }}</strong> to <strong>{{ $data['receiverName'] }}</strong> for re-evaluation.</p>
    @if (!empty($data['message']))
        <p><strong>Note/Comment:</strong> {{ $data['message'] }}</p>
    @endif
    <p><a href="{{ $projectLink }}">Click here to view the project</a></p>

@endif

<hr>

<p><em><small>This is a system-generated notification. Please do not reply to this email.</small></em></p>