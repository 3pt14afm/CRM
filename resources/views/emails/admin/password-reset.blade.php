<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Your Password Has Been Reset</title>
    <style>
        body {
            margin: 0;
            padding: 0;
            background-color: #f4f4f7;
            font-family: Arial, sans-serif;
            color: #333333;
        }
        .wrapper {
            width: 100%;
            padding: 40px 16px;
            box-sizing: border-box;
        }
        .card {
            max-width: 560px;
            margin: 0 auto;
            background: #ffffff;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 2px 6px rgba(0,0,0,0.08);
        }
        .header {
            background-color: #4FA34E;
            padding: 28px 32px;
        }
        .header h1 {
            margin: 0;
            color: #ffffff;
            font-size: 20px;
            font-weight: 700;
            letter-spacing: 0.3px;
        }
        .body {
            padding: 32px;
        }
        .body p {
            margin: 0 0 16px;
            font-size: 15px;
            line-height: 1.6;
            color: #444444;
        }
        .credential-box {
            background-color: #e2ffd8;
            border-left: 4px solid #4FA34E;
            border-radius: 4px;
            padding: 16px 20px;
            margin: 24px 0;
        }
        .credential-box p {
            margin: 0 0 8px;
            font-size: 14px;
            color: #555555;
        }
        .credential-box p:last-child { margin: 0; }
        .password-value {
            font-family: 'Courier New', Courier, monospace;
            font-size: 17px;
            font-weight: 700;
            color: #1a56db;
            letter-spacing: 1px;
        }
        .warning {
            background-color: #fff8e1;
            border: 1px solid #f5c842;
            border-radius: 4px;
            padding: 14px 18px;
            margin: 20px 0;
            font-size: 14px;
            color: #7a5c00;
            line-height: 1.5;
        }
        .btn-wrap {
            text-align: center;
            margin: 28px 0 8px;
        }
        .btn {
            display: inline-block;
            background-color: #4FA34E;
            color: #ffffff !important;
            text-decoration: none;
            padding: 13px 32px;
            border-radius: 6px;
            font-size: 15px;
            font-weight: 600;
        }
        .footer {
            text-align: center;
            padding: 20px 32px;
            font-size: 12px;
            color: #999999;
            border-top: 1px solid #eeeeee;
        }
    </style>
</head>
<body>
<div class="wrapper">
    <div class="card">

        <div class="header">
            <h1>Password Reset Notification</h1>
        </div>

        <div class="body">
            <p>Hi <strong>{{ $userName }}</strong>,</p>

            {{-- Only this line differs between the two scenarios --}}
            @if ($resetByAdmin)
                <p>An administrator has reset your account password. You can log in using the default password below.</p>
            @else
                <p>Your account password has been reset. You can log in using the default password below.</p>
            @endif

            <div class="credential-box">
                <p>Default Password</p>
                <p class="password-value">{{ $defaultPassword }}</p>
            </div>

            <div class="warning">
                ⚠️ For your security, you will be required to change your password
                the next time you log in. Please do not share your credentials with anyone.
            </div>

            <div class="btn-wrap">
                <a href="{{ $loginUrl }}" class="btn">Log In Now</a>
            </div>

            @if ($resetByAdmin)
                <p>If you did not expect this change or believe this was done in error, please contact your system administrator immediately.</p>
            @endif
        </div>

        <div class="footer">
            This is an automated message. Please do not reply to this email.
        </div>

    </div>
</div>
</body>
</html>