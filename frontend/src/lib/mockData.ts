export const mockStudentStats = {
  applications: 0,
  responses: 0,
  placement: 'Not Yet',
};

export const mockTips = [
  {
    quote: "Apply early! Schools fill up by mid-November",
    author: "Ama K.",
    year: "2024",
  },
  {
    quote: "Don't just apply to popular schools in Kumasi, try regional schools too",
    author: "Kofi D.",
    year: "2023",
  },
  {
    quote: "Always follow up with a phone call 3 days after applying",
    author: "Grace O.",
    year: "2024",
  }
];

export const mockSchools = [
  {
    id: "sunyani-shs",
    name: "Sunyani Senior High School",
    rating: 4.6,
    reviewCount: 12,
    matchScore: 94,
    location: {
      town: "Sunyani",
      region: "Bono Region",
      distanceKm: 2.8,
    },
    transport: {
      mode: "Trotro",
      durationMins: 10,
      cost: "GH₵2",
      route: "Sunyani Station → Nana Bosoma",
    },
    stats: {
      successRate: 82,
      acceptedCount: 9,
      totalAamustedApplicants: 11,
      currentCompetition: "LOW",
      currentApplicants: 1,
      avgResponseDays: 5,
    },
    contact: {
      headmaster: "Mr. Isaac Owusu",
      coordinator: "Mr. Benjamin Mensah",
      email: "ict@sunyani-shs.edu.gh",
      phone: "0244-XXX-XXX",
      lastVerified: "3 days ago",
    },
    insiderTips: [
      {
        quote: "Apply early - they fill slots by mid-Nov",
        author: "Abena M.",
        year: 2024,
        status: "Accepted",
      },
      {
        quote: "Mention you're from Sunyani, they prefer local students who won't have transport issues",
        author: "Yaw K.",
        year: 2023,
        status: "Accepted",
      },
      {
        quote: "Go through Mr. Mensah (ICT Coord), not the headmaster. He handles interns directly",
        author: "Ama D.",
        year: 2024,
        status: "Accepted",
      },
      {
        quote: "They need help with BECE ICT prep - offer to run extra classes, big plus!",
        author: "Kofi A.",
        year: 2023,
        status: "Accepted",
      }
    ],
    requirements: [
      "IT Education background",
      "Available 5 days/week",
      "Teach JHS 1-3 ICT",
    ],
    semesters: [
      { name: "Semester 1 (Jan-Apr)", available: true },
      { name: "Semester 2 (Aug-Nov)", available: true },
    ],
    capacity: "4-6 interns per semester",
  },
  {
    id: "fiapre-shs",
    name: "Fiapre Senior High School",
    rating: 4.2,
    reviewCount: 8,
    matchScore: 89,
    location: {
      town: "Fiapre",
      region: "Bono Region",
      distanceKm: 8.5,
    },
    transport: {
      mode: "Trotro",
      durationMins: 25,
      cost: "GH₵4",
      route: "Sunyani → Fiapre",
    },
    stats: {
      successRate: 75,
      acceptedCount: 6,
      totalAamustedApplicants: 8,
      currentCompetition: "MODERATE",
      currentApplicants: 3,
      avgResponseDays: 8,
    },
    contact: {
      headmaster: "Mrs. Sarah Boakye",
      coordinator: "Mr. Thomas Kusi",
      email: "info@fiapreshs.edu.gh",
      phone: "0208-XXX-XXX",
      lastVerified: "1 week ago",
    },
    insiderTips: [
      {
        quote: "Apply directly to ICT coordinator. The admin office is too slow.",
        author: "Kwaku P.",
        year: 2023,
        status: "Accepted",
      }
    ],
    requirements: [
      "IT Education or Computer Science",
      "Assist in Lab Setup",
    ],
    semesters: [
      { name: "Semester 1 (Jan-Apr)", available: true },
      { name: "Semester 2 (Aug-Nov)", available: false },
    ],
    capacity: "2 interns per semester",
  },
  {
    id: "bechem-presby",
    name: "Bechem Presbyterian SHS",
    rating: 4.0,
    reviewCount: 5,
    matchScore: 85,
    location: {
      town: "Bechem",
      region: "Ahafo Region",
      distanceKm: 22,
    },
    transport: {
      mode: "STC Bus",
      durationMins: 45,
      cost: "GH₵15",
      route: "Sunyani → Bechem",
    },
    stats: {
      successRate: 88,
      acceptedCount: 7,
      totalAamustedApplicants: 8,
      currentCompetition: "LOW",
      currentApplicants: 0,
      avgResponseDays: 6,
    },
    contact: {
      headmaster: "Rev. Dr. Agyeman",
      coordinator: "Ms. Rita Yeboah",
      email: "contact@bechempresby.edu.gh",
      phone: "0555-XXX-XXX",
      lastVerified: "1 month ago",
    },
    insiderTips: [
      {
        quote: "They really value punctuality. Be ready for morning devotion.",
        author: "Samuel T.",
        year: 2022,
        status: "Accepted",
      }
    ],
    requirements: [
      "IT Education",
      "Willingness to participate in school activities",
    ],
    semesters: [
      { name: "Semester 1 (Jan-Apr)", available: true },
      { name: "Semester 2 (Aug-Nov)", available: true },
    ],
    capacity: "3 interns per semester",
  }
];

export const mockApplications = [
  {
    id: "app-1",
    schoolId: "sunyani-shs",
    status: "OPENED",
    timeline: {
      sentAt: "Oct 28, 2:45 PM",
      deliveredAt: "Oct 28, 2:46 PM",
      openedAt: "Oct 29, 9:20 AM",
      respondedAt: null,
    },
    expectedResponse: "Within 3-5 more days",
    message: "Mr. Mensah opened your email 2 hours ago",
  },
  {
    id: "app-2",
    schoolId: "fiapre-shs",
    status: "DELIVERED",
    timeline: {
      sentAt: "Oct 28, 3:15 PM",
      deliveredAt: "Oct 28, 3:16 PM",
      openedAt: null,
      respondedAt: null,
    },
    expectedResponse: "They typically open within 2-3 days",
    message: "Sent 1 day ago",
  },
  {
    id: "app-3",
    schoolId: "bechem-presby",
    status: "DELIVERED",
    timeline: {
      sentAt: "Oct 28, 3:30 PM",
      deliveredAt: "Oct 28, 3:31 PM",
      openedAt: null,
      respondedAt: null,
    },
    expectedResponse: "Unknown",
    message: "Sent 1 day ago",
  }
];
