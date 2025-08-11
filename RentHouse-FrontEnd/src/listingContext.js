import React, { createContext, useContext, useState } from "react";

const AppStateContext = createContext();
export const initialListings = [
    { 
      id: 1, 
      title: 'Apartment', 
      price: 1200, 
      location: 'New York', 
      image: 'https://plus.unsplash.com/premium_photo-1676823553207-758c7a66e9bb?fm=jpg&q=60&w=3000&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8NXx8YXBhcnRtZW50JTIwaW50ZXJpb3J8ZW58MHx8MHx8fDA%3D', 
      contact: '(212) 555-1234', 
      nbOfBedrooms: 5, 
      propertyType: 'Apartment' ,
      status: 'Available',
      description: 'A beautiful, spacious apartment in the heart of the city with modern amenities.'
    },
    { 
      id: 2, 
      title: 'House', 
      price: 2000, 
      location: 'Los Angeles', 
      image: 'https://images.pexels.com/photos/280222/pexels-photo-280222.jpeg?cs=srgb&dl=pexels-pixabay-280222.jpg&fm=jpg', 
      contact: '(310) 555-6789', 
      nbOfBedrooms: 5, 
      propertyType: 'House',
      status: 'Rented',
      description: 'A charming house with a large backyard, perfect for families.'
    },
    { 
      id: 3, 
      title: 'Apartment', 
      price: 800, 
      location: 'Chicago', 
      image: 'https://images.unsplash.com/photo-1493809842364-78817add7ffb?fm=jpg&q=60&w=3000&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8NHx8YXBhcnRtZW50fGVufDB8fDB8fHww', 
      contact: '(312) 555-2345', 
      nbOfBedrooms: 5, 
      propertyType: 'Apartment',
      status: 'Available',
      description: 'A cozy apartment in a quiet neighborhood, close to public transport.'

    },
  ];

export const AppStateProvider = ({ children }) => {
    const [allListings, setAllListings] = useState(initialListings);

    return (
        <AppStateContext.Provider value={{ allListings, setAllListings }}>
            {children}
        </AppStateContext.Provider>
    );
};

export const useAppState = () => useContext(AppStateContext);