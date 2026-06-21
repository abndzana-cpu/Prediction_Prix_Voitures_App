export const IconGauge = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
    <path d="M12 21a9 9 0 1 0-9-9" strokeLinecap="round" />
    <path d="M12 12 8 16" strokeLinecap="round" />
    <path d="M3 12h2M19 12h2M12 3v2M5.6 5.6l1.4 1.4M18.4 5.6 17 7" strokeLinecap="round" />
  </svg>
);

export const IconHistory = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
    <path d="M3 12a9 9 0 1 0 3-6.7" strokeLinecap="round" />
    <path d="M3 4v5h5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M12 7v5l3 3" strokeLinecap="round" />
  </svg>
);

export const IconChart = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
    <path d="M4 19V5M4 19h16" strokeLinecap="round" />
    <path d="M8 16V11M12.5 16V8M17 16v-5" strokeLinecap="round" />
  </svg>
);

export const IconCar = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
    <path d="M3 13l1.5-4.5A2 2 0 0 1 6.4 7h11.2a2 2 0 0 1 1.9 1.5L21 13" strokeLinecap="round" strokeLinejoin="round" />
    <rect x="2.5" y="13" width="19" height="5" rx="1.5" />
    <circle cx="7" cy="18.5" r="1.6" />
    <circle cx="17" cy="18.5" r="1.6" />
  </svg>
);

export const IconStar = (props) => (
  <svg viewBox="0 0 24 24" fill={props.filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.6" {...props}>
    <path d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.1 6.5L12 17.6 6.2 20.5l1.1-6.5L2.5 9.4l6.6-.9z" strokeLinejoin="round" />
  </svg>
);

export const IconUpload = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
    <path d="M12 16V4M12 4 7 9M12 4l5 5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const IconX = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
    <path d="M6 6l12 12M18 6 6 18" strokeLinecap="round" />
  </svg>
);

export const IconUser = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
    <circle cx="12" cy="8" r="3.4" />
    <path d="M5 20c1.2-3.6 4-5.4 7-5.4s5.8 1.8 7 5.4" strokeLinecap="round" />
  </svg>
);

export const IconTrash = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
    <path d="M4 7h16M9 7V4.8A.8.8 0 0 1 9.8 4h4.4a.8.8 0 0 1 .8.8V7M6 7l1 13a2 2 0 0 0 2 1.9h6a2 2 0 0 0 2-1.9l1-13" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
