@if ($type === 'advanced')
    <p>You have successfully {{ $data['action'] }} SPRF proposal <strong>{{ $referenceNo }}</strong>.</p>
    <p><strong>Status: </strong>{{ $data['statusDetail'] }}</p>
    <p><a href="{{ $projectLink }}">Click here to view the project</a></p>

@elseif ($type === 'rejected')
    <p>You have successfully disapproved SPRF proposal <strong>{{ $referenceNo }}</strong>.</p>
    <ul>
        <li>Status: Disapproved</li>
        <li>Routed To: System Archive</li>
    </ul>
    <p><a href="{{ $projectLink }}">Click here to view the project</a></p>

@elseif ($type === 'returned_to_entry')
    <p>You have successfully returned SPRF proposal <strong>{{ $referenceNo }}</strong>.</p>
    <ul>
        <li>Status: Returned for Revision</li>
        <li>Routed To: {{ $data['pmName'] }}</li>
    </ul>
    <p><a href="{{ $projectLink }}">Click here to view the project</a></p>

@elseif ($type === 'sent_back')
    <p>You have successfully returned SPRF proposal <strong>{{ $referenceNo }}</strong>.</p>
    <p><strong>Routed To: {{ $data['receiverName'] }}</strong></p>
    <p><a href="{{ $projectLink }}">Click here to view the project</a></p>

@endif

<hr>

<p><em><small>This is a system-generated notification. Please do not reply to this email.</small></em></p> 