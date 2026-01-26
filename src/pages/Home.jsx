import { useState, useEffect, useRef } from "react";
import { Swiper, SwiperSlide } from 'swiper/react';
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';
import { Navigation, Pagination } from 'swiper/modules';
import c2c_logo from "../assets/C2C_logo.png";
import discord_logo from "../assets/discord_icon.png";
import { ChevronDownIcon } from '@heroicons/react/24/solid';
import c2c_videos from "../../api/videos.js";

function Home() {
  const [pgaSectionIsOpen, pgaSetIsOpen] = useState(false);
  const [livSectionIsOpen, livSetIsOpen] = useState(false);
  const [stonehengeIsOpen, stonehengeSetIsOpen] = useState(false);
  const [scratchIsOpen, scratchSetIsOpen] = useState(false);

  const [videos, setVideos] = useState([]);

  useEffect(() => {
    const loadVideos = async () => {
      const res = await fetch(c2c_videos);
      const data = await res.json();
      setVideos(data);
    }
    loadVideos();
  }, []);

  const VideoCollage = () => {
    if (!videos.length) return null;

    return (
      <div className="carousel-wrapper">
        <div className="video-outer-wrapper">
          <Swiper
            className="video-swiper"
            modules={[Navigation, Pagination]}
            navigation
            pagination={{ el: '.swiper-custom-pagination', clickable: true }}
            spaceBetween={20}
            slidesPerView={1}
            loop
          >
            {videos.map((src, idx) => (
              <SwiperSlide key={idx}>
                <iframe
                  src={`https://www.youtube-nocookie.com/embed/${src}?autoplay=1&mute=1&loop=1&playlist=${src}&controls=0`}
                  allow="autoplay; fullscreen"
                  allowFullScreen
                  title={`Video ${idx}`}
                />
              </SwiperSlide>
            ))}
          </Swiper>
          <div className="swiper-custom-pagination" />
        </div>
      </div>
    );
  };

  return (
    <>
      <div className="header-container">
        <div className="welcome-container">
          <h2>Welcome to  </h2>
          <img className="C2C-image" src={c2c_logo} alt="C2C" />
          <h2>  Country Club!</h2>
        </div>
        <a href="#clips-section" className="down-arrow">
          <span className="sr-only">Scroll to next section</span>
          <div
            style={{
              display: 'inline-flex',
              borderRadius: '50%',
              backgroundColor: 'rgba(0, 0, 0, 0.2)',
              padding: '8px',
              width: '25px',
              height: '25px',
              justifyContent: 'center',
              alignItems: 'center',
              cursor: 'pointer',
            }}  
          >
            <ChevronDownIcon style={{ height: '24px', width: '24px', color: 'white' }} />
          </div>
        </a>
      </div>
      <section id="clips-section">
        <div className="cool-shots-container">
          <h1 className="outline-text">C2C Member Highlights!</h1>
          <VideoCollage />
        </div>
      </section>
      <section id="about-us-section">
        <div className="main-content">
          <div className="about-us">
            <h1>About Us</h1>
            <h2>At Coast to Coast we specialize in custom tournaments resembling the PGA Tour & LIV Golf, as well as a custom monthly tournament, Stonehenge.</h2>
            <h4>→ What do we mean by this?</h4>
            <div className="horizontal-span">
              <div className="info-section">
                <div className="expandable-section">
                  <button
                    onClick={() => pgaSetIsOpen(!pgaSectionIsOpen)}
                    className="expandable-section-button"
                  >
                    {pgaSectionIsOpen ? 'PGA Tour Format ▲' : 'PGA Tour Format ▼'}
                  </button>

                  {pgaSectionIsOpen && (
                    <div className="expandable-content">
                      <ul>
                        <li>Each week, there is a tour event corresponding to the PGA Tour & major championships, broken up into 3 formats: Front 9, Back 9, and Full 18.</li>
                        <li>Competing in these events rewards Diamond Points (DPs), rewarded in quantities based on ranking in both Scratch and Handicap standings.</li>
                        <li>At the end of the season, players with the greatest accumulation of DPs compete in a FedEx Cup style playoffs, and are assigned seeding accordingly.</li>
                      </ul>
                    </div>
                  )}
                </div>

                <div className="expandable-section">
                  <button
                    onClick={() => livSetIsOpen(!livSectionIsOpen)}
                    className="expandable-section-button"
                  >
                    {livSectionIsOpen ? 'LIV Team Format ▲' : 'LIV Team Format ▼'}
                  </button>

                  {livSectionIsOpen && (
                    <div className="expandable-content">
                      <ul>
                        <li>At the beginning of the season, each team captain drafts players out of the country club player pool.</li>
                        <li>Scratch and Handicap totals are taken on the scores of each team, and a set number of LIV points are rewarded based on placement.</li>
                        <li>These LIV points translate into LIV buttons decorating each player's avatar.</li>
                        <li>Ultimately, the team which earns the most cumulative points from both Scratch and Handicap are declared the LIV Team champions of the year.</li>
                      </ul>
                    </div>
                  )}
                </div>

                <div className="expandable-section">
                  <button
                    onClick={() => stonehengeSetIsOpen(!stonehengeIsOpen)}
                    className="expandable-section-button"
                  >
                    {stonehengeIsOpen ? 'Stonehenge ▲' : 'Stonehenge ▼'}
                  </button>

                  {stonehengeIsOpen && (
                    <div className="expandable-content">
                      <ul>
                        <li>Stonehenge is a monthly, 4 round tournament.</li>
                        <li>Comprised of a Front 9, Back 9, and Full 18, it gives a sneakpeek preview of next week's C2C Tour event.</li>
                        <li>Winners of monthly Stonehenge tournament (Scratch and Handicap champions) earn the birthstone for that month.</li>
                      </ul>
                    </div>
                  )}
                </div>
                
                <div className="expandable-section">
                  <button
                    onClick={() => scratchSetIsOpen(!scratchIsOpen)}
                    className="expandable-section-button"
                  >
                    {scratchIsOpen ? 'Scratch and Handicap System ▲' : 'Scratch and Handicap System ▼'}
                  </button>

                  {scratchIsOpen && (
                    <div className="expandable-content">
                      <ul>
                        <li>To provide a more competitive balance among members of varying skill levels, C2C utilizes a handicap system.</li>
                        <li>This system favors higher-handicapped players, giving them a greater chance of winning events.</li>
                        <li>Likewise, a scratch leaderboard is maintained, to the benefit of lower-handicapped players.</li>
                      </ul>
                    </div>
                  )}
                </div>
              </div>
              <div className="invite-section">
                <a 
                  href="https://discord.gg/nUCuV4Qxaa"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="discord-container"
                >
                  <h4>We're on Discord! Click on the banner to join.</h4>
                  <img className="discord-icon" src={discord_logo} alt="discord" />
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

export default Home;