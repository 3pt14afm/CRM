import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout'; // Adjust path if needed
import { Head } from '@inertiajs/react';
function Current() {
  return (
    <div>Current</div>
  )
}
Current.layout = page => <AuthenticatedLayout children={page} />
export default Current