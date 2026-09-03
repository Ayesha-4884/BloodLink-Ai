# BloodLink AI — Project Report

## The Problem We're Solving

Every year, countless lives are lost not because blood isn't available, but because it can't be found fast enough. In an emergency, families still scramble through WhatsApp groups, phone contacts, and hospital noticeboards searching for the right donor. Meanwhile, blood banks rely on fragmented records, and perfectly willing donors often have no idea someone nearby urgently needs their blood type.

The result? Precious hours wasted at the worst possible moment.

**This affects:** emergency patients, trauma victims, surgical teams, family members racing against time, and overworked hospital blood-bank coordinators who are doing their best with outdated tools.

## Our Solution

BloodLink AI is a responsive web prototype that shows how a centralized donor network could eliminate this bottleneck. It lets donors register their details, allows patients or families to submit urgent blood requests, and instantly matches requests with the most compatible available donors based on blood type, location, and readiness to donate.



This demo is built as a browser-based proof of concept, giving judges and stakeholders a hands-on walkthrough of the entire user journey — from registration to real-time tracking to a completed donation certificate.

**Who it's for right now:** voluntary blood donors, patients and family members requesting blood, and hospital coordinators previewing how automated matching could work.

## Why It Matters

BloodLink AI directly tackles the coordination gap. Instead of hoping the right donor sees the right message at the right time, the platform:

- Surfaces compatible donors in seconds
- Prioritizes the closest available matches
- Tracks each request's progress transparently
- Reduces the emotional and logistical burden on families during emergencies

With backend integration, this prototype could scale into a nationwide system connecting donors, hospitals, and blood banks in real time.

## How It Works

At the heart of BloodLink AI is a transparent scoring engine. When a request comes in, every eligible donor receives a match score from 0–100% based on:

- **Blood compatibility** — exact match or medically compatible donor (+50 or +35)
- **Location** — same city gets the highest priority (+30)
- **Availability & eligibility** — currently available and above 50 kg (+20)

The demo also includes an interactive 8×8 blood compatibility chart, a simulated status tracker that walks through Searching → Donor Found → On the Way → Completed, and a mobile-style notification overlay that shows what a matched donor alert would feel like.

## Technology We Used

We kept the stack simple and accessible on purpose: plain HTML, CSS, and vanilla JavaScript. This keeps the demo lightweight, fast to load, and easy to extend. State persistence is handled through the browser's `localStorage`, so the prototype feels alive across page refreshes without needing a server.

The matching logic is currently rules-based and fully transparent — exactly what you'd want in a life-critical medical tool. A production version could layer machine learning on top of this foundation for demand forecasting and smarter dispatch.

## What We've Built So Far

- Donor registration with real-time form validation
- Blood request submission with urgency levels
- Rules-based AI matching with 0–100% compatibility scores
- Animated status tracker for each request
- Simulated donor notification overlay
- Interactive blood compatibility chart
- Donation history and printable certificate generation
- Persistent data across sessions using `localStorage`

## What This Prototype Doesn't Do Yet

We're intentionally transparent about the current scope:

- There is no backend server or database — all data lives in the browser
- Notifications are simulated in the UI, not sent via real SMS or push
- Location matching uses city names, not GPS coordinates or precise distance
- There is no hospital or blood-bank admin dashboard yet
- Donor identity verification is not implemented
- The matching engine is rules-based, not machine-learning driven

These are the natural next steps on the roadmap once the core experience is validated.

## Looking Ahead

BloodLink AI is more than a dashboard — it's a vision for a world where no one dies waiting for blood that already exists. With SMS 
integration, geospatial routing, verified donor profiles, and hospital dashboards, this prototype can grow into a national emergency response layer for blood donation.

## A vision by:
SYEDA ASMA JAMIL
AYESHA IMRAN 












