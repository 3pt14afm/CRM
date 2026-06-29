@if ($type === 'queued')
    <p>SPRF proposal <strong>{{ $referenceNo }}</strong> has been forwarded to your queue by <strong>{{ $data['senderName'] }}</strong> for {{ $data['action'] }}.</p>
    <p><a href="{{ $projectLink }}">Click here to view the project</a></p>

@elseif ($type === 'sent_back')
    <p>SPRF proposal <strong>{{ $referenceNo }}</strong> has been returned to your queue by <strong>{{ $data['actorName'] }}</strong>.</p>
    @if (!empty($data['message']))
        <p><strong>Note/Comment:</strong> {{ $data['message'] }}</p>
    @endif
    <p><a href="{{ $projectLink }}">Click here to view the project</a></p>

@elseif ($type === 'withdrawn')
    <p>SPRF proposal <strong>{{ $referenceNo }}</strong> was withdrawn by <strong>{{ $data['pmName'] }}</strong> and has been removed from your queue.</p>

@elseif ($type === 'cancelled')
    <p>SPRF proposal <strong>{{ $referenceNo }}</strong> was cancelled by <strong>{{ $data['pmName'] }}</strong> and has been removed from your queue.</p>
    <p><a href="{{ $projectLink }}">Click here to view the project</a></p>

@endif

<hr>

<p><em><small>This is a system-generated notification. Please do not reply to this email.</small></em></p>