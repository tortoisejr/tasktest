<?php
// Get x and y as strings
$x = $_GET['x'] ?? '';
$y = $_GET['y'] ?? '';

// Validate: must be non-empty and contain only digits
if (!preg_match('/^\d+$/', $x) || !preg_match('/^\d+$/', $y)) {
    die("NaN");
}

// Convert both to string integers
$f_num = $x;
$s_num = $y;

// If both numbers are zero, LCM does not exist
if ($f_num === "0" && $s_num === "0") {
    echo "NaN";
    exit;
}

// -----------------------------
// GCD using BCMath
// -----------------------------
function bc_gcd($a, $b) {
    while ($b !== "0") {
        $temp = bcmod($a, $b);
        $a = $b;
        $b = $temp;
    }
    return $a;
}

try {

    // Compute GCD
    $gcd = bc_gcd($f_num, $s_num);

    // Compute LCM = (x * y) / gcd
    $mul = bcmul($f_num, $s_num);
    $lcm = bcdiv($mul, $gcd, 0); // scale 0 → no decimals

    echo $lcm;

} catch (Exception $e) {
    echo "NaN";
}
?>
