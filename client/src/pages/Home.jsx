import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Swiper, SwiperSlide } from 'swiper/react';
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';
import { Navigation, Pagination } from 'swiper/modules';
import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import c2c_logo from "../assets/C2C_logo.png";
import highlights_image from "../assets/highlights.png"
import tortoise_shell from "../assets/tortoise-shell.svg";
import discord_logo from "../assets/discord_icon.png";
import kogaChambersBay12 from "../assets/kogaChambersBay12.mp4";
import kogaStAndrews12 from "../assets/kogaStAndrews12.mp4";
import kogaStAndrews17 from "../assets/kogaStAndrews17.mp4";
import metroidWolfCreek13 from "../assets/MetroidWolfCreek13.mov";
import kiwibopCongressional16 from "../assets/KiwibopCongressional16.mp4";
import { ChevronDownIcon } from '@heroicons/react/24/solid';
import Tooltip from "../components/Tooltip";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlay, faPause, faExpand } from "@fortawesome/free-solid-svg-icons";

function Home() {
  const [pgaSectionIsOpen, pgaSetIsOpen] = useState(false);
  const [livSectionIsOpen, livSetIsOpen] = useState(false);
  const [stonehengeIsOpen, stonehengeSetIsOpen] = useState(false);
  const [scratchIsOpen, scratchSetIsOpen] = useState(false);

  const videos = [
    kogaChambersBay12,
    kogaStAndrews12,
    kiwibopCongressional16,
    metroidWolfCreek13,
    kogaStAndrews17
  ];

  const VideoCollage = () => {
    const refs = useRef([]);
    const [playing, setPlaying] = useState(videos.map(() => true));

    const toggleVideo = (index) => {
      const video = refs.current[index];
      if (!video) return;
      const newPlaying = [...playing];
      if (video.paused) {
        video.play();
        newPlaying[index] = true;
      } else {
        video.pause();
        newPlaying[index] = false;
      }
      setPlaying(newPlaying);
    };

    const enterFullscreen = (e) => {
      e.stopPropagation(); // Prevent toggling playback when fullscreen icon is clicked
      const video = e.currentTarget.closest('.collage-video-container').querySelector('video');
      if (!video) return;

      if (video.requestFullscreen) {
        video.requestFullscreen();
      } else if (video.webkitRequestFullscreen) {
        video.webkitRequestFullscreen();
      } else if (video.msRequestFullscreen) {
        video.msRequestFullscreen();
      }
    };

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
                <div className="video-inner-wrapper">
                  <div
                    className="collage-video-container cursor-pointer"
                    onClick={() => toggleVideo(idx)}
                  >
                    <video
                      className="collage-video"
                      ref={(el) => (refs.current[idx] = el)}
                      src={src}
                      autoPlay
                      loop
                      muted
                      playsInline
                    />
                    <div className="video-overlay">
                      <span className="video-icon">
                        {playing[idx] ? (
                          <FontAwesomeIcon icon={faPause} /> 
                        ) : (
                          <FontAwesomeIcon icon={faPlay} />
                        )}
                      </span>
                      <div className="fullscreen-icon-container" onClick={enterFullscreen}>
                        <Tooltip text="Enable fullscreen">
                          <span className="fullscreen-icon">
                            <FontAwesomeIcon icon={faExpand} />
                          </span>
                        </Tooltip>
                      </div>
                    </div>
                  </div>
                </div>
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