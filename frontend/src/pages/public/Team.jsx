import PublicLayout from '../../layouts/PublicLayout';
import StaffFlipCard from '../../components/StaffFlipCard';
import '../../assets/css/pages/team.css';
import '../../assets/css/staff.css';

export default function Team() {
  const teamMembers = [
    { 
      id: 1, 
      name: 'Dr. Raymond E. Pineda', 
      role: 'Clinic Lead', 
      image: '/images/Dr. Pineda.png', 
      specialty: 'General & Cosmetic Dentistry', 
      award: 'Founder & Principal Dentist' 
    },
    { 
      id: 2, 
      name: 'Dr. Sarah Yzabel D. Malit', 
      role: 'Associate Dentist', 
      image: '/images/Dr. Malit.png', 
      specialty: 'Orthodontics & Pediatric Care', 
      award: 'Board Certified Practitioner' 
    },
    { 
      id: 3, 
      name: 'Arlene Delos Reyes', 
      role: 'Clinic Manager', 
      image: '/images/Mrs. Arlene.png', 
      specialty: 'Patient Relations & Admin', 
      award: 'Certified Dental Assistant' 
    }
  ];

  return (
    <PublicLayout>
      <section className="page-header" style={{ background: '#F9FAFB', padding: '96px 0 64px' }}>
        <div className="container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <h1 className="page-title" style={{ color: '#1E2939', fontSize: '36px', fontWeight: 500 }}>
            Meet the Pineda Dental Clinic Team
          </h1>
        </div>
      </section>

      <section style={{ background: '#F9FAFB', paddingBottom: '96px' }}>
        <div className="container">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '24px', maxWidth: '1104px', margin: '0 auto' }}>
            {teamMembers.map((member) => (
              <StaffFlipCard key={member.id} staff={member} />
            ))}
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}