# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [v1.0.0] - 2026-07-20

### Added
- **Authentication**: Robust Session management integrated with Flask-Login and secure React-Router contexts.
- **Dashboard**: Role-based analytics dashboards featuring aggregate GPAs, average attendances, and total enrollments.
- **Directory**: Full Admin and Faculty CRUD operations handling user profile allocations.
- **Courses**: Dynamic enrollment features linking students to courses and distinct faculty.
- **Attendance**: Date-specific logging featuring bulk-save optimization.
- **Marks**: Granular grade matrices converting Raw Internal & External scores to standard 10.0 scale GPA grades.
- **Reports**: Real-time downloadable CSV extracts and printable formatted Student Transcripts.
- **Announcements**: Global broadcast network for cross-campus news alerts.
- **Settings**: System logging and personalized profile modifications.

### Improved
- Complete UI/UX redesign implementing standard Glassmorphism layouts.
- Database optimization utilizing pure SQLAlchemy relationships with active lazy loading optimizations.
- Upgraded the security matrix enforcing `X-CSRFToken` dependencies across all data-mutating requests.
