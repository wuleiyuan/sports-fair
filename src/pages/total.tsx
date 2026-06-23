import ActivityList from '@/components/ActivityList';
import PersonalBests from '@/components/PB';
import { Helmet } from 'react-helmet-async';

const HomePage = () => {
  return (
    <>
      <Helmet>
        <html lang="en" />
      </Helmet>
      <div data-kinetic>
        <div className="max-w-6xl mx-auto px-4 pt-6">
          <PersonalBests />
        </div>
        <ActivityList />
      </div>
    </>
  );
};

export default HomePage;
