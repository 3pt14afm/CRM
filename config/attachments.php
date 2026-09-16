<?php

return [
    'max_files_per_entry' => 3,
    'max_file_size_kb' => 10240,            // 10MB per file
    'max_total_bytes' => 45 * 1024 * 1024,  // 5mb allowance, not derived from post_max_size
];