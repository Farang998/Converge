import { Link } from 'react-router-dom';

const NotFound = () => (
  <div className="not-found-page">
    <h1>404 – Page Not Found</h1>
    <p>The page you are looking for does not exist.</p>
    <Link to="/" className="button">
      Go Home
    </Link>
  </div>
);

export default NotFound;
