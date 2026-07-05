import { Link } from "react-router-dom";

export default function TopBar() {
  return (
    <div className="top-bar">
      <div className="container top-bar-content">
        <div className="top-bar-left">
          <svg
            className="icon"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
            <circle cx="12" cy="10" r="3"></circle>
          </svg>
          <a
            href="https://www.google.com/maps/search/?api=1&query=1395%20Rizal%20Avenue%2C%20corner%20W%2014th%20St%2C%20West%20Tapinac%2C%20Olongapo%20City"
            target="_blank"
            rel="noopener noreferrer"
            className="top-bar-address"
          >
            1395 Rizal Avenue, corner W 14th St, West Tapinac, Olongapo City
          </a>
        </div>
        <Link to="/login" className="staff-login">
          <svg
            className="icon"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
          </svg>
          Staff Portal Login
        </Link>
      </div>
    </div>
  );
}
