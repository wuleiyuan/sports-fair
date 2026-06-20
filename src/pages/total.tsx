import ActivityList from '@/components/ActivityList';
import Layout from '@/components/Layout';
import { Helmet } from 'react-helmet-async';

const HomePage = () => {
  return (
    <Layout>
      <Helmet>
        <html lang="en" />
      </Helmet>
      <div data-kinetic className="k-page">
        <ActivityList />
      </div>
    </Layout>
  );
};

export default HomePage;
