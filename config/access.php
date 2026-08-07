<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Privileged Employee IDs
    |--------------------------------------------------------------------------
    |
    | Employee IDs granted admin-equivalent access to all companies'
    | contracts (view + manage) and visibility, regardless of assignment.
    | Referenced by ContractController and the AppliesCompanyVisibility
    | trait so the two stay in sync.
    |
    */

    'privileged_employee_ids' => ['0721', '0039', '0283'],

];