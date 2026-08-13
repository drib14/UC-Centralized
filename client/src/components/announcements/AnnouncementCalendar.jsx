import React, { useState, useMemo } from 'react';
import {
    FaChevronLeft, FaChevronRight, FaCalendarDay, FaTriangleExclamation,
    FaGraduationCap, FaBuildingColumns, FaBullhorn, FaClock, FaCalendarDays,
    FaLocationDot, FaTag, FaCircleExclamation, FaCircleInfo
} from 'react-icons/fa6';

export const ANNOUNCEMENT_TYPES = {
    suspension: {
        label: 'Class Suspension',
        color: '#dc2626',
        bg: '#fef2f2',
        border: '#fecaca',
        text: '#991b1b',
        icon: FaTriangleExclamation,
        badgeClass: 'bg-danger text-white'
    },
    academic: {
        label: 'Academic Notice',
        color: '#2563eb',
        bg: '#eff6ff',
        border: '#bfdbfe',
        text: '#1e40af',
        icon: FaGraduationCap,
        badgeClass: 'bg-primary text-white'
    },
    administrative: {
        label: 'Administrative Memo',
        color: '#d97706',
        bg: '#fffbeb',
        border: '#fde68a',
        text: '#92400e',
        icon: FaBuildingColumns,
        badgeClass: 'bg-warning text-dark'
    },
    event_notice: {
        label: 'Campus Event Notice',
        color: '#7c3aed',
        bg: '#f5f3ff',
        border: '#ddd6fe',
        text: '#5b21b6',
        icon: FaCalendarDays,
        badgeClass: 'bg-purple text-white'
    },
    general: {
        label: 'General Update',
        color: '#059669',
        bg: '#ecfdf5',
        border: '#a7f3d0',
        text: '#065f46',
        icon: FaBullhorn,
        badgeClass: 'bg-success text-white'
    }
};

export const getTypeMeta = (type) => {
    return ANNOUNCEMENT_TYPES[type] || ANNOUNCEMENT_TYPES.general;
};

const AnnouncementCalendar = ({ announcements = [], departments = [], onSelectAnnouncement, onEdit, onDelete, isAdmin = false }) => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [selectedTypeFilter, setSelectedTypeFilter] = useState('ALL');

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];

    const prevMonth = () => {
        setCurrentDate(new Date(year, month - 1, 1));
    };

    const nextMonth = () => {
        setCurrentDate(new Date(year, month + 1, 1));
    };

    const goToToday = () => {
        const today = new Date();
        setCurrentDate(today);
        setSelectedDate(today);
    };

    // Calendar day grid calculations
    const calendarDays = useMemo(() => {
        const firstDayOfMonth = new Date(year, month, 1).getDay(); // 0 (Sun) to 6 (Sat)
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const daysInPrevMonth = new Date(year, month, 0).getDate();

        const days = [];

        // Previous month padding
        for (let i = firstDayOfMonth - 1; i >= 0; i--) {
            days.push({
                date: new Date(year, month - 1, daysInPrevMonth - i),
                isCurrentMonth: false
            });
        }

        // Current month days
        for (let i = 1; i <= daysInMonth; i++) {
            days.push({
                date: new Date(year, month, i),
                isCurrentMonth: true
            });
        }

        // Next month padding to fill a 6-row or 5-row complete grid (multiples of 7)
        const remaining = (7 - (days.length % 7)) % 7;
        for (let i = 1; i <= remaining; i++) {
            days.push({
                date: new Date(year, month + 1, i),
                isCurrentMonth: false
            });
        }

        return days;
    }, [year, month]);

    // Check if an announcement covers a specific date
    const isAnnouncementActiveOnDate = (ann, dateObj) => {
        if (!ann) return false;
        const target = new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate()).getTime();

        const startRaw = ann.startDate || ann.date || ann.createdAt;
        if (!startRaw) return false;

        const startD = new Date(startRaw);
        const start = new Date(startD.getFullYear(), startD.getMonth(), startD.getDate()).getTime();

        if (!ann.endDate) {
            return target === start;
        }

        const endD = new Date(ann.endDate);
        const end = new Date(endD.getFullYear(), endD.getMonth(), endD.getDate()).getTime();

        return target >= start && target <= end;
    };

    // Filter announcements by type if selected
    const filteredAnnouncements = useMemo(() => {
        if (selectedTypeFilter === 'ALL') return announcements;
        return announcements.filter(a => (a.type || 'general') === selectedTypeFilter);
    }, [announcements, selectedTypeFilter]);

    // Announcements active on the selected date
    const selectedDateAnnouncements = useMemo(() => {
        return filteredAnnouncements.filter(ann => isAnnouncementActiveOnDate(ann, selectedDate));
    }, [filteredAnnouncements, selectedDate]);

    // Formatted date string helpers
    const isSameDay = (d1, d2) => {
        if (!d1 || !d2) return false;
        return d1.getFullYear() === d2.getFullYear() &&
               d1.getMonth() === d2.getMonth() &&
               d1.getDate() === d2.getDate();
    };

    const isToday = (d) => isSameDay(d, new Date());

    const formatDuration = (startDate, endDate) => {
        if (!startDate) return 'Date not specified';
        const start = new Date(startDate);
        const startStr = start.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
        if (!endDate) return startStr;

        const end = new Date(endDate);
        const endStr = end.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });

        if (isSameDay(start, end)) return startStr;

        const diffTime = Math.abs(end - start);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

        return `${startStr} — ${endStr} (${diffDays} Days)`;
    };

    return (
        <div className="announcement-calendar-container">
            {/* Type Filters & Legend */}
            <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3">
                <div className="d-flex flex-wrap align-items-center gap-1">
                    <button
                        type="button"
                        className={`btn btn-sm rounded-pill px-3 fw-semibold ${selectedTypeFilter === 'ALL' ? 'btn-dark' : 'btn-outline-secondary'}`}
                        onClick={() => setSelectedTypeFilter('ALL')}
                    >
                        All Categories ({announcements.length})
                    </button>
                    {Object.entries(ANNOUNCEMENT_TYPES).map(([typeKey, meta]) => {
                        const count = announcements.filter(a => (a.type || 'general') === typeKey).length;
                        const Icon = meta.icon;
                        const isActive = selectedTypeFilter === typeKey;
                        return (
                            <button
                                key={typeKey}
                                type="button"
                                className={`btn btn-sm rounded-pill px-2.5 d-flex align-items-center gap-1.5 fw-semibold transition-all`}
                                style={{
                                    backgroundColor: isActive ? meta.color : meta.bg,
                                    color: isActive ? '#ffffff' : meta.text,
                                    border: `1px solid ${meta.border}`
                                }}
                                onClick={() => setSelectedTypeFilter(typeKey)}
                            >
                                <Icon size={12} />
                                <span>{meta.label}</span>
                                <span className={`badge rounded-pill ${isActive ? 'bg-white text-dark' : 'bg-secondary text-white'}`} style={{ fontSize: '0.7rem' }}>
                                    {count}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </div>

            <div className="row g-4">
                {/* Left / Main: The Interactive Calendar */}
                <div className="col-lg-7 col-xl-8">
                    <div className="card border-0 shadow-sm rounded-4 bg-white overflow-hidden">
                        {/* Month Header Controls */}
                        <div className="p-3 px-4 border-bottom d-flex flex-wrap justify-content-between align-items-center gap-2 bg-light bg-opacity-50">
                            <div className="d-flex align-items-center gap-2">
                                <h4 className="fw-bold text-dark mb-0 font-outfit">
                                    {monthNames[month]} {year}
                                </h4>
                            </div>
                            <div className="d-flex align-items-center gap-1.5">
                                <button
                                    type="button"
                                    className="btn btn-outline-secondary btn-sm rounded-pill px-3 fw-semibold"
                                    onClick={goToToday}
                                >
                                    <FaCalendarDay className="me-1" /> Today
                                </button>
                                <div className="btn-group btn-group-sm">
                                    <button
                                        type="button"
                                        className="btn btn-outline-secondary rounded-start-pill px-2.5"
                                        onClick={prevMonth}
                                        title="Previous Month"
                                    >
                                        <FaChevronLeft />
                                    </button>
                                    <button
                                        type="button"
                                        className="btn btn-outline-secondary rounded-end-pill px-2.5"
                                        onClick={nextMonth}
                                        title="Next Month"
                                    >
                                        <FaChevronRight />
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Weekdays Header */}
                        <div className="calendar-weekday-grid border-bottom bg-light bg-opacity-25 text-muted fw-bold small text-uppercase text-center py-2"
                             style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
                            <span className="text-danger">Sun</span>
                            <span>Mon</span>
                            <span>Tue</span>
                            <span>Wed</span>
                            <span>Thu</span>
                            <span>Fri</span>
                            <span className="text-primary">Sat</span>
                        </div>

                        {/* Days Grid */}
                        <div className="calendar-days-grid p-2"
                             style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
                            {calendarDays.map((dayItem, idx) => {
                                const activeForDay = filteredAnnouncements.filter(a => isAnnouncementActiveOnDate(a, dayItem.date));
                                const hasSuspension = activeForDay.some(a => a.type === 'suspension');
                                const hasAcademic = activeForDay.some(a => a.type === 'academic');
                                const hasAdmin = activeForDay.some(a => a.type === 'administrative');
                                const hasGeneral = activeForDay.some(a => a.type === 'general' || a.type === 'event_notice' || !a.type);

                                const isSelected = isSameDay(dayItem.date, selectedDate);
                                const todayClass = isToday(dayItem.date) ? 'border-warning shadow-sm' : '';

                                return (
                                    <div
                                        key={idx}
                                        className={`calendar-day-cell p-1.5 rounded-3 d-flex flex-column justify-content-between position-relative cursor-pointer transition-all ${
                                            isSelected ? 'bg-primary bg-opacity-10 border border-primary fw-bold' : (dayItem.isCurrentMonth ? 'bg-white hover-bg-light border border-light' : 'bg-light bg-opacity-50 text-muted opacity-50')
                                        } ${todayClass}`}
                                        style={{
                                            minHeight: '82px',
                                            cursor: 'pointer'
                                        }}
                                        onClick={() => setSelectedDate(dayItem.date)}
                                    >
                                        <div className="d-flex justify-content-between align-items-center">
                                            <span className={`small px-1.5 py-0.5 rounded-circle ${isToday(dayItem.date) ? 'bg-warning text-dark fw-bold' : ''}`}>
                                                {dayItem.date.getDate()}
                                            </span>
                                            {activeForDay.length > 0 && (
                                                <span className="badge rounded-pill bg-dark bg-opacity-75" style={{ fontSize: '0.65rem' }}>
                                                    {activeForDay.length}
                                                </span>
                                            )}
                                        </div>

                                        {/* Day Indicator Pills / Badges */}
                                        <div className="day-badges-container d-flex flex-column gap-1 mt-1 overflow-hidden">
                                            {activeForDay.slice(0, 2).map((ann, aIdx) => {
                                                const meta = getTypeMeta(ann.type);
                                                return (
                                                    <div
                                                        key={aIdx}
                                                        className="text-truncate px-1.5 py-0.5 rounded text-white font-outfit"
                                                        style={{
                                                            fontSize: '0.68rem',
                                                            backgroundColor: meta.color,
                                                            lineHeight: '1.2'
                                                        }}
                                                        title={ann.title}
                                                    >
                                                        {ann.type === 'suspension' && '🚨 '}
                                                        {ann.title}
                                                    </div>
                                                );
                                            })}
                                            {activeForDay.length > 2 && (
                                                <span className="text-muted text-center" style={{ fontSize: '0.65rem' }}>
                                                    +{activeForDay.length - 2} more
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Right: Selected Date Detail List */}
                <div className="col-lg-5 col-xl-4">
                    <div className="card border-0 shadow-sm rounded-4 bg-white h-100 p-3">
                        <div className="border-bottom pb-2 mb-3 d-flex justify-content-between align-items-center">
                            <div>
                                <small className="text-muted text-uppercase fw-bold">Active Bulletins for</small>
                                <h5 className="fw-bold text-dark mb-0 font-outfit">
                                    {selectedDate.toLocaleDateString(undefined, { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' })}
                                </h5>
                            </div>
                            {isToday(selectedDate) && (
                                <span className="badge bg-warning text-dark fw-bold px-2.5 py-1 rounded-pill">Today</span>
                            )}
                        </div>

                        <div className="active-announcements-list overflow-y-auto pe-1" style={{ maxHeight: '520px' }}>
                            {selectedDateAnnouncements.length === 0 ? (
                                <div className="text-center text-muted py-5">
                                    <FaCircleInfo size={32} className="mb-2 opacity-25" />
                                    <p className="mb-0 fw-semibold">No scheduled announcements or suspensions for this date.</p>
                                    <small className="text-secondary">Click on any date with a badge to view its details.</small>
                                </div>
                            ) : (
                                selectedDateAnnouncements.map((ann, idx) => {
                                    const meta = getTypeMeta(ann.type);
                                    const Icon = meta.icon;
                                    const deptMatch = departments.find(d => d.code === ann.department);

                                    return (
                                        <div
                                            key={ann._id || idx}
                                            className="card border-0 rounded-3 mb-3 p-3 transition-all hover-shadow"
                                            style={{
                                                backgroundColor: meta.bg,
                                                borderLeft: `5px solid ${meta.color}`
                                            }}
                                        >
                                            <div className="d-flex flex-wrap align-items-center justify-content-between gap-1 mb-2">
                                                <span
                                                    className="badge px-2.5 py-1 rounded-pill d-inline-flex align-items-center gap-1 fw-bold"
                                                    style={{ backgroundColor: meta.color, color: '#ffffff' }}
                                                >
                                                    <Icon size={11} /> {meta.label}
                                                </span>
                                                <span
                                                    className="badge px-2 py-0.5 rounded-pill"
                                                    style={{ backgroundColor: ann.department === 'ALL' ? '#0d6efd' : (deptMatch?.color || '#003399'), color: '#ffffff' }}
                                                >
                                                    {ann.department === 'ALL' ? 'Campus-Wide' : ann.department}
                                                </span>
                                            </div>

                                            <h6 className="fw-bold text-dark mb-1 font-outfit">
                                                {ann.title}
                                            </h6>

                                            {/* Duration Range */}
                                            <div className="d-flex align-items-center gap-1.5 text-muted small mb-2">
                                                <FaClock size={12} className="text-secondary" />
                                                <span className="fw-semibold text-dark">
                                                    {formatDuration(ann.startDate || ann.date, ann.endDate)}
                                                </span>
                                            </div>

                                            <p className="small text-secondary mb-2" style={{ whiteSpace: 'pre-line' }}>
                                                {ann.message || ann.content}
                                            </p>

                                            <div className="d-flex justify-content-between align-items-center pt-2 border-top border-dark border-opacity-10 small text-muted">
                                                <span>Posted by {ann.author || 'Administration'}</span>
                                                {isAdmin && (
                                                    <div className="d-flex gap-1">
                                                        {onEdit && (
                                                            <button
                                                                type="button"
                                                                className="btn btn-outline-secondary btn-sm py-0 px-2"
                                                                style={{ fontSize: '0.75rem' }}
                                                                onClick={() => onEdit(ann)}
                                                            >
                                                                Edit
                                                            </button>
                                                        )}
                                                        {onDelete && (
                                                            <button
                                                                type="button"
                                                                className="btn btn-outline-danger btn-sm py-0 px-2"
                                                                style={{ fontSize: '0.75rem' }}
                                                                onClick={() => onDelete(ann._id)}
                                                            >
                                                                Delete
                                                            </button>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AnnouncementCalendar;
