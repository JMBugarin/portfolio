const base = import.meta.env.BASE_URL.replace(/\/$/, '')

export const href = (path = '') => `${base}/${path.replace(/^\//, '')}`

export const site = {
  name: 'Joshua Bugarin',
  role: 'Software engineering student',
  school: 'UC Santa Cruz',
  degree: 'B.S. Computer Science, Computer Engineering minor',
  graduation: 'June 2028',
  tagline: 'Third-year computer science student at UC Santa Cruz.',
  about: [
    "I'm majoring in computer science with a computer engineering minor, and I graduate in June 2028. In coursework I've written a graph ADT in C with Kosaraju's algorithm, among other things.",
    "Most of what I write is Python, Rust, C and Dart. I use Python with Pandas, NumPy and OpenCV for machine learning and computer vision, Rust and C for systems code, and Flutter and React Native for mobile apps. I like projects where I can measure the result, whether that's a cache hit ratio, a search time or how many tiles a vision pipeline reads correctly.",
  ],
  email: 'jbugarin85424@gmail.com',
  github: 'https://github.com/JMBugarin',
  linkedin: 'https://linkedin.com/in/Joshua-bugarin',
  resume: 'resume/Joshua-Bugarin-Resume.pdf',
  toolbox: [
    { label: 'Languages', items: ['Python', 'Rust', 'C', 'C++', 'Dart', 'TypeScript'] },
    { label: 'Frameworks', items: ['Flutter', 'React', 'React Native', 'Supabase', 'Astro', 'PySide6', 'OpenCV', 'LightGBM', 'MLX'] },
    { label: 'Tools', items: ['Git', 'GitHub Actions', 'uv', 'Cargo', 'pytest', 'Playwright', 'Xcode', 'Blender'] },
  ],
  log: [
    { when: 'Jun 2028', what: 'UC Santa Cruz', detail: 'B.S. Computer Science, Computer Engineering minor. Sabatte Scholarship. Expected.' },
    { when: 'Oct 2026', what: 'UCSC Silicon Valley HackDev AI Hackathon', detail: 'Built VaultAI with a team: it organizes receipts and business documents with a local model.' },
    { when: 'May 2026', what: 'DesignVerse Hackathon, UC Riverside', detail: 'Won with a team of five. The concept became Ethocal.' },
  ],
}
