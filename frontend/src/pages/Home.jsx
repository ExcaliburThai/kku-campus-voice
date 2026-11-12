import React from "react";
import { Link } from "react-router-dom";
import { PlusCircle, MapPin, CheckCircle2, RefreshCw, ClipboardCheck, Clock, Send, ArrowRight, Lightbulb } from "lucide-react";
import useLoad from "../hooks/useLoad.js";
import Notice from "../components/Notice.jsx";
import Stat from "../components/Stat.jsx";
import MiniMap from "../components/MiniMap.jsx";
import IssueCard from "../components/IssueCard.jsx";

export default function Home() {

  const { data, error, loading, reload } = useLoad(

    "/api/public/dashboard"

  );



  const { data: issues } = useLoad(

    "/api/public/issues?limit=200"

  );



  const s = data?.summary || {};



  return (

    <main>

      {/* ==================== HERO ==================== */}

      <section className="hero">

        <div className="container hero-grid">

          {/* ข้อความด้านซ้าย */}

          <div>

            <span className="eyebrow">

              CAMPUS REPORTING PLATFORM

            </span>



            <h1>

              ทุกเสียงของนักศึกษา

              <br />

              <em>สร้างการเปลี่ยนแปลงได้</em>

            </h1>



            <p>

              แจ้งปัญหาถนน ไฟฟ้า อาคาร สิ่งแวดล้อม

              และบริการภายในมหาวิทยาลัยขอนแก่น

              พร้อมติดตามความคืบหน้าได้ในที่เดียว

            </p>



            <div className="hero-actions">

              <Link className="btn primary" to="/report">

                <PlusCircle size={18} />

                แจ้งปัญหาใหม่

              </Link>



              <Link className="btn light" to="/issues">

                <MapPin size={18} />

                ดูแผนที่ปัญหา

              </Link>

            </div>



            <div className="hero-note">

              <CheckCircle2 size={17} />

              รับแจ้งปัญหาได้ทั้งแบบสาธารณะและส่วนตัว

            </div>

          </div>



          {/* รูปภาพด้านขวา */}

          <div className="hero-graphic">

            <div className="graphic-orb">

              <img

                src="/images/eggs.png"

                alt="KKU Campus Voice"

                className="hero-orb-image"

              />

            </div>



            <div className="floating-card">

              <span className="dot green" />

              ติดตามการแก้ไขได้ทุกขั้นตอน

            </div>

          </div>

        </div>

      </section>



      {/* ==================== DASHBOARD ==================== */}

      <section className="container section">

        <div className="section-head">

          <div>

            <span className="eyebrow dark">

              LIVE OVERVIEW

            </span>



            <h2>ภาพรวมการรับแจ้งปัญหา</h2>



            <p>

              แสดงเฉพาะเรื่องที่อนุญาตให้เผยแพร่ต่อสาธารณะ

            </p>

          </div>



          <button

            className="icon-btn"

            onClick={reload}

            title="รีเฟรช"

          >

            <RefreshCw size={18} />

          </button>

        </div>



        <Notice error={error} />



        {loading ? (

          <p>กำลังโหลดข้อมูล...</p>

        ) : (

          <div className="stats">

            <Stat

              label="รับแจ้งทั้งหมด"

              value={s.total}

              icon={ClipboardCheck}

              color="purple"

            />



            <Stat

              label="รอรับเรื่อง"

              value={s.pending}

              icon={Clock}

              color="red"

            />



            <Stat

              label="กำลังดำเนินการ"

              value={(s.inProgress || 0) + (s.forwarded || 0)}

              icon={Send}

              color="orange"

            />



            <Stat

              label="เสร็จสิ้น"

              value={s.resolved}

              icon={CheckCircle2}

              color="green"

            />

          </div>

        )}

      </section>



      {/* ==================== MAP & CATEGORIES ==================== */}

      <section className="container section split">

        {/* แผนที่ปัญหา */}

        <div className="panel">

          <div className="panel-head">

            <div>

              <h3>แผนที่จุดแจ้งปัญหา</h3>

              <p>เฉพาะเรื่องสาธารณะที่มีพิกัด</p>

            </div>



            <Link to="/issues" className="text-link">

              ดูทั้งหมด

              <ArrowRight size={16} />

            </Link>

          </div>



          <MiniMap issues={issues || []} />



          <div className="map-legend">

            <span>

              <i className="dot red" />

              รอรับเรื่อง

            </span>



            <span>

              <i className="dot orange" />

              ดำเนินการ

            </span>



            <span>

              <i className="dot green" />

              เสร็จสิ้น

            </span>

          </div>

        </div>



        {/* ประเภทปัญหาที่พบบ่อย */}

        <div className="panel">

          <div className="panel-head">

            <div>

              <h3>ประเภทปัญหาที่พบบ่อย</h3>

              <p>จำนวนเรื่องร้องเรียนตามหมวดหมู่</p>

            </div>

          </div>



          {!data?.categories?.length ? (

            <div className="empty">

              ยังไม่มีข้อมูลเรื่องร้องเรียน

            </div>

          ) : (

            <div className="category-list">

              {data.categories.slice(0, 7).map((c) => (

                <div className="category-row" key={c.name}>

                  <div>

                    <span>{c.name}</span>

                    <strong>{c.count} เรื่อง</strong>

                  </div>



                  <div className="progress">

                    <div

                      style={{

                        width: `${Math.round(

                          (c.count /

                            (data.categories[0].count || 1)) *

                            100

                        )}%`,

                      }}

                    />

                  </div>

                </div>

              ))}

            </div>

          )}



          <div className="tip">

            <Lightbulb size={22} />



            <p>

              พบปัญหาในคณะ อาคาร หรือถนน?

              เลือกหมวดหมู่และปักหมุดตำแหน่ง

              เพื่อช่วยให้แก้ไขได้ตรงจุด

            </p>

          </div>

        </div>

      </section>



      {/* ==================== LATEST REPORTS ==================== */}

      <section className="container section">

        <div className="section-head">

          <div>

            <span className="eyebrow dark">

              LATEST REPORTS

            </span>



            <h2>เรื่องร้องเรียนล่าสุด</h2>

          </div>



          <Link className="text-link" to="/issues">

            ดูรายการทั้งหมด

            <ArrowRight size={16} />

          </Link>

        </div>



        <div className="issue-grid">

          {!data?.recentIssues?.length ? (

            <div className="empty panel">

              ยังไม่มีเรื่องร้องเรียนสาธารณะ

            </div>

          ) : (

            data.recentIssues.map((issue) => (

              <IssueCard

                key={issue.id}

                issue={issue}

              />

            ))

          )}

        </div>

      </section>



      {/* ==================== CALL TO ACTION ==================== */}

      <section className="container cta">

        <div>

          <h2>เห็นปัญหา อย่าปล่อยผ่าน</h2>



          <p>

            ร่วมสร้างพื้นที่มหาวิทยาลัยที่ปลอดภัย

            และน่าอยู่สำหรับทุกคน

          </p>

        </div>



        <Link to="/report" className="btn light">

          แจ้งปัญหาเลย

          <ArrowRight size={18} />

        </Link>

      </section>

    </main>

  );

}
