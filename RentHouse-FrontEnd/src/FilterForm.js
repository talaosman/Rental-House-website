import React, { useState } from 'react';

const FilterForm = ({ onChange }) => {
  const [filter, setFilter] = useState({
    location: '',
    price: '',
    bedrooms: '',
    type: '',
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFilter({ ...filter, [name]: value });
    onChange(filter);
  };

  return (
    <form>
      <input
        type="text"
        name="location"
        placeholder="Location"
        value={filter.location}
        onChange={handleChange}
      />
      <input
        type="number"
        name="price"
        placeholder="Price"
        value={filter.price}
        onChange={handleChange}
      />
      <input
        type="number"
        name="bedrooms"
        placeholder="Bedrooms"
        value={filter.bedrooms}
        onChange={handleChange}
      />
      <select
        name="type"
        value={filter.type}
        onChange={handleChange}
      >
        <option value="">Select Type</option>
        <option value="Apartment">Apartment</option>
        <option value="House">House</option>
        <option value="Condo">Condo</option>
      </select>
    </form>
  );
};

export default FilterForm