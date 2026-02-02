import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout'; // Adjust path if needed
import { Head } from '@inertiajs/react';

function Archived() {
  return (
    <div>Archived</div>
  )
}
Archived.layout = page => <AuthenticatedLayout children={page} />
export default Archived