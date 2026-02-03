import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head } from '@inertiajs/react';
import { MdGroups,MdPersonAddAlt1  } from "react-icons/md";
import { FaUserCheck } from "react-icons/fa";
import { BsExclamationOctagonFill, BsTicketPerforatedFill  } from "react-icons/bs";

export default function Dashboard() {

     const cards = [
        {icon: MdGroups, name: "Total Customers", num:12000, percent: 30},
        {icon: FaUserCheck, name: "Active Accounts", num:8320, percent: 10},
        {icon: MdPersonAddAlt1, name: "Prospect Customers", num:128, percent: 1.4},
        {icon: BsExclamationOctagonFill, name: "At-Risk Accounts", num:45, percent: 1},
        {icon: BsTicketPerforatedFill, name: "Open Tickets", num:78, percent: 1.1},

     ]

    const getCardStyles = (name, index) => {
        const clipId = `bgblur_${index}`;
        
        const themes = {
            'Total Customer': {
                icon: 'bg-[#74C5FF]/25 border-[#74C5FF]/30',
                bg: 'bg-[#74C5FF]/20',
                svgFill: '#0565D2',
                svgBack: '#0565D2'
            },
            'Active Accounts': {
                icon: 'bg-[#FFAB74]/25 border-[#FFAB74]/30',
                bg: 'bg-[#FFAB74]/20',
                svgFill: '#FF6400',
                svgBack: '#FF6400'
            },
            'Prospect Customers': {
                icon: 'bg-[#BAEDBD]/25 border-[#BAEDBD]/30',
                bg: 'bg-[#BAEDBD]/30',
                svgFill: '#2D7813',
                svgBack: '#2D7813'
            },
            'At-Risk Accounts': {
                icon: 'bg-[#FF8B8B]/25 border-[#FF8B8B]/30',
                bg: 'bg-[#FF8B8B]/20',
                svgFill: '#FF8B8B',
                svgBack: '#D33D3D'
            },
            'Open Tickets': {
                icon: 'bg-[#D6BBFB]/25 border-[#D6BBFB]/30',
                bg: 'bg-[#D6BBFB]/20',
                svgFill: '#863DD2',
                svgBack: '#863DD2'
            }
        };

        const style = themes[name] || themes['Total Customer'];

        // This returns the SVG structure using the theme's color and unique ID
            const decoration = (
                    <div className="absolute top-0 right-0 w-full h-full overflow-hidden pointer-events-none">
                    {/* The BACK Layer (Larger, lighter blue curve) */}
                    <svg 
                        className="absolute top-0 right-0" 
                        width="67" height="66" viewBox="0 0 67 66" fill="none"
                    >
                        <path 
                        d="M67 65.5C29.9969 65.5 0 36.1747 0 0C0 0 24.7393 0 56.9985 0C62.5214 0 67 4.47715 67 10V65.5Z" 
                        fill={`${style.svgBack}`}
                        fillOpacity="0.05"
                        />
                    </svg>

                    {/* The FRONT Layer (Smaller, blurred curve) */}
                    <svg  className="absolute top-0 right-0" width="49" height="48" viewBox="0 0 49 48" fill="none" >
                        <foreignObject x="-4" y="-4" width="57" height="56">
                        <div 
                            xmlns="http://www.w3.org/1999/xhtml" 
                            style={{ 
                            backdropFilter: 'blur(2px)', 
                            clipPath: `url(#${clipId})`, 
                            height: '100%', 
                            width: '100%' 
                            }} 
                        />
                        </foreignObject>
                        <path 
                        d="M49 48C42.5652 48 36.1935 46.7584 30.2485 44.3462C24.3036 41.934 18.9018 38.3983 14.3518 33.9411C9.80169 29.4839 6.19238 24.1924 3.7299 18.3688C1.26742 12.5452 -5.62546e-07 6.30345 0 0L39 3.33991e-06C44.5228 3.81288e-06 49 4.47716 49 10L49 48Z" 
                        fill={style.svgFill} 
                        fillOpacity="0.1" 
                        />
                        <defs>
                        <clipPath id={clipId} transform="translate(4 4)">
                            <path d="M49 48C42.5652 48 36.1935 46.7584 30.2485 44.3462C24.3036 41.934 18.9018 38.3983 14.3518 33.9411C9.80169 29.4839 6.19238 24.1924 3.7299 18.3688C1.26742 12.5452 -5.62546e-07 6.30345 0 0L39 3.33991e-06C44.5228 3.81288e-06 49 4.47716 49 10L49 48Z"/>
                        </clipPath>
                        </defs>
                    </svg>
                </div>
            );

        return { ...style, decoration };
    };




    return (
        <>
            <Head title="Customer Management Dashboard" />
            <h1 className="text-3xl mt-2 font-semibold text-gray-800">Customer Management Dashboard</h1>
            <div className="mt-8 grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6 mx-6 ">              
               {cards.map((card, index)=>{
                    const Icon = card.icon;
                    const styles = getCardStyles(card.name);
                    return (
                        <div key={index} className={`relative overflow-hidden px-4 py-3 ${styles.bg} rounded-lg shadow-[0px_6px_10px_3px_rgba(0,_0,_0,_0.1)] flex flex-col items-start`}>                 
                           
                           {styles.decoration}
                           
                           <div className={`w-fit mb-2 px-[5px] py-[5px] rounded border flex items-center justify-center ${styles.icon}`}>
                                <Icon size={17} />
                            </div>

                            <div>

                            </div>
                            
                            <p className="text-[11px] text-black font-medium tracking-wider ">{card.name}</p>
                            <p className="text-4xl font-semibold text-gray-900">{card.num.toLocaleString()}</p>
                            <p className="text-[10px] text-green-500 mt-1">+{card.percent}% this month</p>
                        </div>
                    );
                })}
            </div>
        </>
    );
}

// THIS IS THE SECRET SAUCE: It wraps this page in your sidebar layout
Dashboard.layout = page => <AuthenticatedLayout children={page} />