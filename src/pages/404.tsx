import Layout from '@/components/Layout';
import useSiteMetadata from '@/hooks/useSiteMetadata';

const NotFoundPage = () => {
  const { siteUrl } = useSiteMetadata();
  return (
    <Layout>
      <div data-kinetic className="k-page" style={{ textAlign: 'center', paddingTop: 80 }}>
        <h1 className="k-page-title" style={{ fontSize: 72 }}>404</h1>
        <p style={{ color: 'rgba(255,255,255,0.6)', marginTop: 8 }}>This page doesn't exist.</p>
        <p style={{ color: 'rgba(255,255,255,0.4)', marginTop: 4 }}>
          <a style={{ color: '#FF8800' }} href={siteUrl}>{siteUrl}</a>
        </p>
      </div>
    </Layout>
  );
};

export default NotFoundPage;
