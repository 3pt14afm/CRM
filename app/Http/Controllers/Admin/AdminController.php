<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Inertia\Inertia;

class AdminController extends Controller
{
    public function approverMatrix()
    {
        return Inertia::render('Admin/ApproverMatrix');
    }

    public function userGroupAccessRights()
    {
        return Inertia::render('Admin/UserGroupAccessRights');
    }

    public function userAccessRights()
    {
        return Inertia::render('Admin/UserAccessRights');
    }

    public function auditLogs()
    {
        return Inertia::render('Admin/AuditLogs');
    }
}