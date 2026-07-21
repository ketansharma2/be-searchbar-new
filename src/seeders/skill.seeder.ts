import mongoose from "mongoose";
import { Skill } from "../models/Skill";
import { env } from "../config/env"; // adjust path

// ==================== TECHNICAL SKILLS ====================
const technicalSkills = [
  // Frontend Development
  { name: "React.js", category: "Frontend" },
  { name: "Next.js", category: "Frontend" },
  { name: "Angular", category: "Frontend" },
  { name: "Vue.js", category: "Frontend" },
  { name: "Svelte", category: "Frontend" },
  { name: "TypeScript", category: "Frontend" },
  { name: "JavaScript (ES6+)", category: "Frontend" },
  { name: "HTML5", category: "Frontend" },
  { name: "CSS3", category: "Frontend" },
  { name: "Tailwind CSS", category: "Frontend" },
  { name: "Bootstrap", category: "Frontend" },
  { name: "Material-UI", category: "Frontend" },
  { name: "Redux", category: "Frontend" },
  { name: "Zustand", category: "Frontend" },
  { name: "Webpack", category: "Frontend" },
  { name: "Vite", category: "Frontend" },
  
  // Backend Development
  { name: "Node.js", category: "Backend" },
  { name: "Express.js", category: "Backend" },
  { name: "NestJS", category: "Backend" },
  { name: "Python", category: "Backend" },
  { name: "Django", category: "Backend" },
  { name: "Flask", category: "Backend" },
  { name: "FastAPI", category: "Backend" },
  { name: "Java", category: "Backend" },
  { name: "Spring Boot", category: "Backend" },
  { name: "PHP", category: "Backend" },
  { name: "Laravel", category: "Backend" },
  { name: "C#", category: "Backend" },
  { name: ".NET Core", category: "Backend" },
  { name: "Go", category: "Backend" },
  { name: "Ruby on Rails", category: "Backend" },
  { name: "Rust", category: "Backend" },
  
  // Database Technologies
  { name: "MongoDB", category: "Database" },
  { name: "MySQL", category: "Database" },
  { name: "PostgreSQL", category: "Database" },
  { name: "Redis", category: "Database" },
  { name: "Elasticsearch", category: "Database" },
  { name: "Cassandra", category: "Database" },
  { name: "Oracle", category: "Database" },
  { name: "SQL Server", category: "Database" },
  { name: "Firebase", category: "Database" },
  { name: "DynamoDB", category: "Database" },
  { name: "SQL", category: "Database" },
  { name: "NoSQL", category: "Database" },
  
  // Cloud & DevOps
  { name: "AWS (Amazon Web Services)", category: "Cloud" },
  { name: "Microsoft Azure", category: "Cloud" },
  { name: "Google Cloud Platform", category: "Cloud" },
  { name: "Docker", category: "DevOps" },
  { name: "Kubernetes", category: "DevOps" },
  { name: "Jenkins", category: "DevOps" },
  { name: "Git", category: "DevOps" },
  { name: "GitHub Actions", category: "DevOps" },
  { name: "GitLab CI/CD", category: "DevOps" },
  { name: "Terraform", category: "DevOps" },
  { name: "Ansible", category: "DevOps" },
  { name: "Linux Administration", category: "DevOps" },
  { name: "Nginx", category: "DevOps" },
  { name: "Apache", category: "DevOps" },
  { name: "Prometheus", category: "DevOps" },
  { name: "Grafana", category: "DevOps" },
  
  // Mobile Development
  { name: "React Native", category: "Mobile" },
  { name: "Flutter", category: "Mobile" },
  { name: "Swift", category: "Mobile" },
  { name: "Kotlin", category: "Mobile" },
  { name: "Android (Java)", category: "Mobile" },
  { name: "iOS Development", category: "Mobile" },
  { name: "Xamarin", category: "Mobile" },
  { name: "Ionic", category: "Mobile" },
  
  // API & Integration
  { name: "REST API", category: "API" },
  { name: "GraphQL", category: "API" },
  { name: "WebSockets", category: "API" },
  { name: "gRPC", category: "API" },
  { name: "OAuth 2.0", category: "API" },
  { name: "JWT (JSON Web Tokens)", category: "API" },
  { name: "Swagger/OpenAPI", category: "API" },
  { name: "Postman", category: "API" },
  
  // Testing
  { name: "Jest", category: "Testing" },
  { name: "Mocha", category: "Testing" },
  { name: "Chai", category: "Testing" },
  { name: "Cypress", category: "Testing" },
  { name: "Playwright", category: "Testing" },
  { name: "Selenium", category: "Testing" },
  { name: "JUnit", category: "Testing" },
  { name: "PyTest", category: "Testing" },
  { name: "Unit Testing", category: "Testing" },
  { name: "Integration Testing", category: "Testing" },
  { name: "End-to-End Testing", category: "Testing" },
  
  // AI & Data Science
  { name: "Machine Learning", category: "AI/ML" },
  { name: "Deep Learning", category: "AI/ML" },
  { name: "Natural Language Processing", category: "AI/ML" },
  { name: "Computer Vision", category: "AI/ML" },
  { name: "PyTorch", category: "AI/ML" },
  { name: "TensorFlow", category: "AI/ML" },
  { name: "Scikit-learn", category: "AI/ML" },
  { name: "Pandas", category: "AI/ML" },
  { name: "NumPy", category: "AI/ML" },
  { name: "Data Visualization", category: "AI/ML" },
  { name: "Tableau", category: "AI/ML" },
  { name: "Power BI", category: "AI/ML" },
  
  // Security
  { name: "Cybersecurity", category: "Security" },
  { name: "Network Security", category: "Security" },
  { name: "Application Security", category: "Security" },
  { name: "Penetration Testing", category: "Security" },
  { name: "Vulnerability Assessment", category: "Security" },
  { name: "Data Encryption", category: "Security" },
  { name: "Identity & Access Management", category: "Security" },
  { name: "Firewall Management", category: "Security" },
  
  // Blockchain
  { name: "Blockchain", category: "Blockchain" },
  { name: "Smart Contracts", category: "Blockchain" },
  { name: "Ethereum", category: "Blockchain" },
  { name: "Solidity", category: "Blockchain" },
  { name: "Web3.js", category: "Blockchain" },
  { name: "Hyperledger", category: "Blockchain" },
  
  // Architecture & Design Patterns
  { name: "Microservices", category: "Architecture" },
  { name: "Event-Driven Architecture", category: "Architecture" },
  { name: "Domain-Driven Design", category: "Architecture" },
  { name: "MVC", category: "Architecture" },
  { name: "MVVM", category: "Architecture" },
  { name: "System Design", category: "Architecture" },
  { name: "Clean Code", category: "Architecture" },
  
  // CMS & CRM
  { name: "WordPress", category: "CMS" },
  { name: "Drupal", category: "CMS" },
  { name: "Joomla", category: "CMS" },
  { name: "Salesforce", category: "CRM" },
  { name: "HubSpot", category: "CRM" },
  { name: "Zoho", category: "CRM" },
];

// ==================== NON-TECHNICAL SKILLS ====================
const nonTechnicalSkills = [
  // Communication Skills
  { name: "Verbal Communication", category: "Communication" },
  { name: "Written Communication", category: "Communication" },
  { name: "Public Speaking", category: "Communication" },
  { name: "Presentation Skills", category: "Communication" },
  { name: "Technical Writing", category: "Communication" },
  { name: "Documentation", category: "Communication" },
  { name: "Active Listening", category: "Communication" },
  { name: "Negotiation Skills", category: "Communication" },
  { name: "Storytelling", category: "Communication" },
  { name: "Interpersonal Communication", category: "Communication" },
  
  // Leadership & Management
  { name: "Leadership", category: "Leadership" },
  { name: "Team Management", category: "Leadership" },
  { name: "Mentoring", category: "Leadership" },
  { name: "Coaching", category: "Leadership" },
  { name: "Conflict Resolution", category: "Leadership" },
  { name: "Decision Making", category: "Leadership" },
  { name: "Strategic Planning", category: "Leadership" },
  { name: "Problem Solving", category: "Leadership" },
  { name: "Critical Thinking", category: "Leadership" },
  { name: "Emotional Intelligence", category: "Leadership" },
  { name: "Change Management", category: "Leadership" },
  { name: "Delegation", category: "Leadership" },
  
  // Project Management
  { name: "Project Management", category: "Management" },
  { name: "Product Management", category: "Management" },
  { name: "Agile Methodologies", category: "Management" },
  { name: "Scrum", category: "Management" },
  { name: "Kanban", category: "Management" },
  { name: "Waterfall", category: "Management" },
  { name: "JIRA", category: "Management" },
  { name: "Asana", category: "Management" },
  { name: "Trello", category: "Management" },
  { name: "Confluence", category: "Management" },
  { name: "Risk Management", category: "Management" },
  { name: "Budget Management", category: "Management" },
  { name: "Resource Planning", category: "Management" },
  { name: "Stakeholder Management", category: "Management" },
  
  // Soft Skills
  { name: "Adaptability", category: "Soft Skills" },
  { name: "Time Management", category: "Soft Skills" },
  { name: "Team Collaboration", category: "Soft Skills" },
  { name: "Self-Motivation", category: "Soft Skills" },
  { name: "Creativity", category: "Soft Skills" },
  { name: "Innovation", category: "Soft Skills" },
  { name: "Attention to Detail", category: "Soft Skills" },
  { name: "Patience", category: "Soft Skills" },
  { name: "Empathy", category: "Soft Skills" },
  { name: "Flexibility", category: "Soft Skills" },
  { name: "Work Ethic", category: "Soft Skills" },
  { name: "Accountability", category: "Soft Skills" },
  { name: "Integrity", category: "Soft Skills" },
  { name: "Stress Management", category: "Soft Skills" },
  { name: "Resilience", category: "Soft Skills" },
  { name: "Curiosity", category: "Soft Skills" },
  
  // Design & Creative
  { name: "UI/UX Design", category: "Design" },
  { name: "Figma", category: "Design" },
  { name: "Adobe Photoshop", category: "Design" },
  { name: "Adobe Illustrator", category: "Design" },
  { name: "Adobe XD", category: "Design" },
  { name: "Sketch", category: "Design" },
  { name: "Wireframing", category: "Design" },
  { name: "Prototyping", category: "Design" },
  { name: "User Research", category: "Design" },
  { name: "Design Thinking", category: "Design" },
  { name: "Visual Design", category: "Design" },
  { name: "Motion Graphics", category: "Design" },
  { name: "Video Editing", category: "Design" },
  { name: "Photography", category: "Design" },
  { name: "Animation", category: "Design" },
  { name: "Creative Writing", category: "Design" },
  { name: "Content Writing", category: "Design" },
  { name: "Copywriting", category: "Design" },
  
  // Business & Finance
  { name: "Business Analysis", category: "Business" },
  { name: "Financial Analysis", category: "Business" },
  { name: "Accounting", category: "Business" },
  { name: "Budgeting", category: "Business" },
  { name: "Financial Modeling", category: "Business" },
  { name: "Investment Analysis", category: "Business" },
  { name: "Taxation", category: "Business" },
  { name: "Auditing", category: "Business" },
  { name: "QuickBooks", category: "Business" },
  { name: "SAP", category: "Business" },
  { name: "Entrepreneurship", category: "Business" },
  { name: "Business Strategy", category: "Business" },
  { name: "Market Research", category: "Business" },
  { name: "Data Analysis", category: "Business" },
  
  // Marketing
  { name: "Digital Marketing", category: "Marketing" },
  { name: "SEO (Search Engine Optimization)", category: "Marketing" },
  { name: "SEM (Search Engine Marketing)", category: "Marketing" },
  { name: "Social Media Marketing", category: "Marketing" },
  { name: "Content Marketing", category: "Marketing" },
  { name: "Email Marketing", category: "Marketing" },
  { name: "Google Analytics", category: "Marketing" },
  { name: "Google Ads", category: "Marketing" },
  { name: "Facebook Ads", category: "Marketing" },
  { name: "LinkedIn Marketing", category: "Marketing" },
  { name: "Brand Management", category: "Marketing" },
  { name: "Public Relations", category: "Marketing" },
  { name: "Affiliate Marketing", category: "Marketing" },
  
  // Languages
  { name: "English (Native)", category: "Languages" },
  { name: "Spanish", category: "Languages" },
  { name: "French", category: "Languages" },
  { name: "German", category: "Languages" },
  { name: "Chinese (Mandarin)", category: "Languages" },
  { name: "Japanese", category: "Languages" },
  { name: "Korean", category: "Languages" },
  { name: "Russian", category: "Languages" },
  { name: "Portuguese", category: "Languages" },
  { name: "Arabic", category: "Languages" },
  { name: "Hindi", category: "Languages" },
  { name: "Italian", category: "Languages" },
  { name: "Dutch", category: "Languages" },
  { name: "Swedish", category: "Languages" },
  
  // Education & Training
  { name: "Teaching", category: "Education" },
  { name: "Training & Development", category: "Education" },
  { name: "Curriculum Design", category: "Education" },
  { name: "E-Learning", category: "Education" },
  { name: "Instructional Design", category: "Education" },
  { name: "Corporate Training", category: "Education" },
  
  // Healthcare & Wellness
  { name: "Healthcare Management", category: "Healthcare" },
  { name: "Nursing", category: "Healthcare" },
  { name: "Medical Coding", category: "Healthcare" },
  { name: "HIPAA Compliance", category: "Healthcare" },
  { name: "Mental Health First Aid", category: "Healthcare" },
  { name: "First Aid/CPR", category: "Healthcare" },
  { name: "Yoga Instruction", category: "Wellness" },
  { name: "Meditation", category: "Wellness" },
  { name: "Nutrition", category: "Wellness" },
  { name: "Fitness Training", category: "Wellness" },
  
  // Customer Service
  { name: "Customer Relationship Management", category: "Customer Service" },
  { name: "Client Management", category: "Customer Service" },
  { name: "Customer Support", category: "Customer Service" },
  { name: "Complaint Resolution", category: "Customer Service" },
  { name: "Client Retention", category: "Customer Service" },
  { name: "Help Desk", category: "Customer Service" },
  
  // Administrative
  { name: "Office Management", category: "Administrative" },
  { name: "Administrative Support", category: "Administrative" },
  { name: "Data Entry", category: "Administrative" },
  { name: "Scheduling", category: "Administrative" },
  { name: "Travel Coordination", category: "Administrative" },
  { name: "Event Planning", category: "Administrative" },
  { name: "Records Management", category: "Administrative" },
  { name: "Virtual Assistance", category: "Administrative" },
  
  // Personal Development
  { name: "Growth Mindset", category: "Personal Development" },
  { name: "Goal Setting", category: "Personal Development" },
  { name: "Self-Discipline", category: "Personal Development" },
  { name: "Personal Branding", category: "Personal Development" },
  { name: "Networking", category: "Personal Development" },
  { name: "Social Skills", category: "Personal Development" },
  { name: "Cultural Awareness", category: "Personal Development" },
  { name: "Diversity & Inclusion", category: "Personal Development" },
  
  // Specialized
  { name: "Legal Research", category: "Legal" },
  { name: "Contract Law", category: "Legal" },
  { name: "Corporate Law", category: "Legal" },
  { name: "Intellectual Property", category: "Legal" },
  { name: "Human Resources", category: "HR" },
  { name: "Recruitment", category: "HR" },
  { name: "Talent Acquisition", category: "HR" },
  { name: "Performance Management", category: "HR" },
  { name: "Employee Relations", category: "HR" },
  { name: "Payroll", category: "HR" },
  { name: "Benefits Administration", category: "HR" },
  
  // Creative & Arts
  { name: "Drawing", category: "Arts" },
  { name: "Painting", category: "Arts" },
  { name: "Music", category: "Arts" },
  { name: "Dance", category: "Arts" },
  { name: "Acting", category: "Arts" },
  { name: "Sculpture", category: "Arts" },
  { name: "Calligraphy", category: "Arts" },
  { name: "Crafting", category: "Arts" },
];

// Combine all skills
const allSkills = [...technicalSkills, ...nonTechnicalSkills];

async function seedSkills() {
  try {
    await mongoose.connect(env.mongoUri);

    console.log("✅ Connected to MongoDB");

    await Skill.deleteMany({});
    console.log("🧹 Cleared existing skills");

    const inserted = await Skill.insertMany(allSkills);

    console.log(`✅ Seeded ${inserted.length} skills`);

    // Group by category for display
    const grouped = inserted.reduce((acc, skill) => {
      if (!acc[skill.category]) acc[skill.category] = [];
      acc[skill.category].push(skill.name);
      return acc;
    }, {} as Record<string, string[]>);

    // Display statistics
    console.log("\n📊 Skill Categories Summary:");
    const categories = Object.keys(grouped).sort();
    categories.forEach((category) => {
      console.log(`  ${category}: ${grouped[category].length} skills`);
    });

    console.log(`\n📈 Total: ${inserted.length} skills across ${categories.length} categories`);
    
    // Show sample of technical skills
    console.log("\n💻 Sample Technical Skills:");
    technicalSkills.slice(0, 10).forEach(skill => {
      console.log(`  - ${skill.name} (${skill.category})`);
    });

    // Show sample of non-technical skills
    console.log("\n🤝 Sample Non-Technical Skills:");
    nonTechnicalSkills.slice(0, 10).forEach(skill => {
      console.log(`  - ${skill.name} (${skill.category})`);
    });

    console.log("\n🎉 Skill seeding completed successfully.");
    
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error("❌ Seeding failed:", error);
    await mongoose.disconnect().catch(() => {});
    process.exit(1);
  }
}

seedSkills();