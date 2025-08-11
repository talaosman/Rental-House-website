import React from 'react';
import { Link } from 'react-router-dom';


const PropertyCard = ({ property }) => {
  return (
    <div className="property-card">
      <img src={`./assets/images/${property.image}`} alt={property.location} />
      <h3>{property.location}</h3>
      <p>${property.price} / month</p>
      <Link to={`/property/${property.id}`}>View Details</Link>
    </div>
  );
};

export default PropertyCard;