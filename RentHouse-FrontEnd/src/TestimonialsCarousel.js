import React, { useState, useEffect } from "react";
import Carousel from "react-multi-carousel";
import "react-multi-carousel/lib/styles.css";
import axios from "axios";
import "./TestimonialsCarousel.css";

const TestimonialsCarousel = () => {
  const [feedbacks, setFeedbacks] = useState([]);

  useEffect(() => {
    axios.get(`${process.env.REACT_APP_API_URL || "http://localhost:5000"}/api/feedback`)
      .then(res => setFeedbacks(res.data))
      .catch(console.error);
  }, []);

  if (!feedbacks.length) return <p>Loading feedback...</p>;

  const responsive = {
    desktop: { breakpoint: { max: 3000, min: 1024 }, items: 3 },
    tablet: { breakpoint: { max: 1024, min: 464 }, items: 2 },
    mobile: { breakpoint: { max: 464, min: 0 }, items: 1 }
  };

  return (
    <div className="testimonials-carousel">
      <h2>What Our Users Say</h2>
      <Carousel
        responsive={responsive}
        infinite
        autoPlay
        autoPlaySpeed={5000}
        keyBoardControl
        showDots
        removeArrowOnDeviceType={["mobile"]}
      >
        {feedbacks.map((fb, index) => (
          <div key={fb.id ?? `testimonial-${index}`} className="testimonial-card">
            <div className="testimonial-text">"{fb.message}"</div>
            <div className="testimonial-meta">
              <strong>{fb.username}</strong>, <span>{fb.email}</span>
            </div>
          </div>
        ))}
      </Carousel>
    </div>
  );
};

export default TestimonialsCarousel;
