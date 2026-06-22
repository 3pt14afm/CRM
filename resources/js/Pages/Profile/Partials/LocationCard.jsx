import { cardStyle } from './ProfileStyles';

export default function LocationCard({ location }) {
    const locationAddress =
        typeof location === 'object' && location !== null
            ? location.address
            : location;

    const mapQuery = encodeURIComponent(locationAddress || 'Cebu City, Philippines');

    return (
        <div className={cardStyle}>
            <div className="p-2 sm:p-4">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-400 pb-2">
                    Location
                </h4>
                <div className="overflow-hidden rounded-lg border border-gray-200 h-60 w-full bg-gray-100">
                    <iframe
                        title="User Location"
                        width="100%"
                        height="100%"
                        style={{ border: 0 }}
                        loading="lazy"
                        allowFullScreen
                        src={`https://maps.google.com/maps?q=${mapQuery}&output=embed`}
                    />
                </div>
            </div>
        </div>
    );
}