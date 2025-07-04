'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import AdminNavbarComponent from '@/app/components/admin/adminnavbar'
import { motion } from 'framer-motion'
import Select from 'react-select'
import DatePicker from 'react-datepicker'
import SearchableSelect from '@/app/components/admin/SearchableSelect'
import {
	FaFilter,
	FaSortAmountDown,
	FaSortAmountUp,
	FaFileExport,
	FaSort
} from 'react-icons/fa'
import { fetchUsers } from '../../../../utils/adminRequests'
import { fetchCoaches } from '../../../../utils/adminRequests'
import { fetchActivities } from '../../../../utils/userRequests'
import SessionDetailModal from '@/app/components/admin/SessionDetailModal'
import SessionsChart from '@/app/components/admin/SessionsChart'
import { saveAs } from 'file-saver'
import 'react-datepicker/dist/react-datepicker.css'

interface Option {
	value: string
	label: string
}

const CompletedSessions = () => {
	const router = useRouter()
	const [users, setUsers] = useState<Option[]>([])
	const [coaches, setCoaches] = useState<Option[]>([])
	const [activities, setActivities] = useState<Option[]>([])
	const [selectedUser, setSelectedUser] = useState<Option | null>(null)
	const [selectedCoach, setSelectedCoach] = useState<Option | null>(null)
	const [selectedActivity, setSelectedActivity] = useState<Option | null>(null)
	const [sessions, setSessions] = useState<any[]>([])
	const [loading, setLoading] = useState(false)
	const [currentPage, setCurrentPage] = useState(1)
	const [totalPages, setTotalPages] = useState(0)
	const [sortBy, setSortBy] = useState('date')
	const [sortOrder, setSortOrder] = useState('desc')
	const [filter, setFilter] = useState('all')
	const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([
		null,
		null
	])
	const [startDate, endDate] = dateRange
	const [summary, setSummary] = useState<any>(null)
	const [selectedSession, setSelectedSession] = useState<any>(null)
	const [summaries, setSummaries] = useState<any[]>([])
	
	// New state for summary table sorting
	const [summarySortBy, setSummarySortBy] = useState<string | null>(null)
	const [summarySortOrder, setSummarySortOrder] = useState<'asc' | 'desc'>('asc')
	const [sortedSummaries, setSortedSummaries] = useState<any[]>([])

	// Initial data fetching
	useEffect(() => {
		const initializeData = async () => {
			await Promise.all([
				fetchUsersList(),
				fetchCoachesList(),
				fetchActivitiesList()
			])
		}
		initializeData()
	}, [])

	// Effect for fetching sessions when user is selected
	useEffect(() => {
		if (selectedUser) {
			fetchCompletedSessions()
		}
	}, [
		selectedUser,
		currentPage,
		sortBy,
		sortOrder,
		filter,
		startDate,
		endDate,
		selectedCoach,
		selectedActivity
	])

	// Effect for fetching all users data when no user is selected and users are loaded
	useEffect(() => {
		if (!selectedUser && users.length > 0) {
			fetchAllUsersCompletedSessions()
		}
	}, [
		selectedUser,
		users.length,
		currentPage,
		sortBy,
		sortOrder,
		filter,
		startDate,
		endDate,
		selectedCoach,
		selectedActivity
	])

	// Effect for sorting summaries when summaries or sort criteria change
	useEffect(() => {
		if (summaries.length > 0) {
			const sorted = [...summaries].sort((a, b) => {
				if (!summarySortBy) return 0

				let aValue, bValue

				switch (summarySortBy) {
					case 'user':
						aValue = a.user.toLowerCase()
						bValue = b.user.toLowerCase()
						break
					case 'totalSessions':
						aValue = a.totalSessions
						bValue = b.totalSessions
						break
					case 'totalPrivateSessions':
						aValue = a.totalPrivateSessions
						bValue = b.totalPrivateSessions
						break
					case 'totalGroupSessions':
						aValue = a.totalGroupSessions
						bValue = b.totalGroupSessions
						break
					default:
						return 0
				}

				if (typeof aValue === 'string') {
					return summarySortOrder === 'asc' 
						? aValue.localeCompare(bValue)
						: bValue.localeCompare(aValue)
				} else {
					return summarySortOrder === 'asc' 
						? aValue - bValue
						: bValue - aValue
				}
			})
			setSortedSummaries(sorted)
		} else {
			setSortedSummaries(summaries)
		}
	}, [summaries, summarySortBy, summarySortOrder])

	const fetchUsersList = async () => {
		try {
			const fetchedUsers = await fetchUsers()
			setUsers(
				fetchedUsers.map(user => ({
					value: user.user_id,
					label: `${user.first_name} ${user.last_name}`
				}))
			)
		} catch (error) {
			console.error('Error fetching users:', error)
		}
	}

	const fetchCoachesList = async () => {
		try {
			const fetchedCoaches = await fetchCoaches()
			setCoaches(
				fetchedCoaches.map(coach => ({
					value: coach.id.toString(),
					label: coach.name
				}))
			)
		} catch (error) {
			console.error('Error fetching coaches:', error)
		}
	}

	const fetchActivitiesList = async () => {
		try {
			const fetchedActivities = await fetchActivities()
			setActivities(
				fetchedActivities.map(activity => ({
					value: activity.id.toString(),
					label: activity.name
				}))
			)
		} catch (error) {
			console.error('Error fetching activities:', error)
		}
	}

	const fetchCompletedSessions = async () => {
		if (!selectedUser) return
		
		setLoading(true)
		try {
			const response = await fetch(
				`/api/completed-sessions?userId=${
					selectedUser.value
				}&page=${currentPage}&sortBy=${sortBy}&sortOrder=${sortOrder}&filter=${filter}&startDate=${
					startDate?.toISOString().split('T')[0] || ''
				}&endDate=${endDate?.toISOString().split('T')[0] || ''}&activityId=${
					selectedActivity?.value || ''
				}&coachId=${selectedCoach?.value || ''}`
			)
			const data = await response.json()
			setSessions(data.sessions)
			setTotalPages(data.totalPages)
			setSummary(data.summary)
		} catch (error) {
			console.error('Error fetching completed sessions:', error)
		} finally {
			setLoading(false)
		}
	}

	const fetchAllUsersCompletedSessions = async () => {
		if (users.length === 0) return
		
		setLoading(true)
		setSummaries([]) // Clear previous summaries
		try {
			const summariesPromises = users.map(async (user) => {
				const response = await fetch(
					`/api/completed-sessions?userId=${
						user.value
					}&page=${currentPage}&sortBy=${sortBy}&sortOrder=${sortOrder}&filter=${filter}&startDate=${
						startDate?.toISOString().split('T')[0] || ''
					}&endDate=${endDate?.toISOString().split('T')[0] || ''}&activityId=${
						selectedActivity?.value || ''
					}&coachId=${selectedCoach?.value || ''}`
				)
				const data = await response.json()
				return { ...data.summary, user: user.label }
			})

			const results = await Promise.all(summariesPromises)
			setSummaries(results)
		} catch (error) {
			console.error('Error fetching user summaries:', error)
		} finally {
			setLoading(false)
		}
	}

	const handleUserChange = (selectedOption: any) => {
		setSelectedUser(selectedOption)
		setCurrentPage(1)
		// Clear individual user data when switching
		if (!selectedOption) {
			setSessions([])
			setSummary(null)
		}
	}

	const handleCoachChange = (selectedOption: any) => {
		setSelectedCoach(selectedOption)
		setCurrentPage(1)
	}

	const handleActivityChange = (selectedOption: any) => {
		setSelectedActivity(selectedOption)
		setCurrentPage(1)
	}

	const handleSort = (field: string) => {
		if (field === 'date') {
			if (sortBy === field) {
				setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
			} else {
				setSortBy(field)
				setSortOrder('asc')
			}
		}
	}

	// New function to handle summary table sorting
	const handleSummarySort = (field: string) => {
		if (summarySortBy === field) {
			// Cycle through: asc -> desc -> null (default)
			if (summarySortOrder === 'asc') {
				setSummarySortOrder('desc')
			} else if (summarySortOrder === 'desc') {
				setSummarySortBy(null)
				setSummarySortOrder('asc')
			}
		} else {
			setSummarySortBy(field)
			setSummarySortOrder('asc')
		}
	}

	// Function to render sort icon for summary table
	const renderSummarySort = (field: string) => {
		if (summarySortBy !== field) {
			return <FaSort className='ml-1 text-gray-400' />
		}
		return summarySortOrder === 'asc' ? (
			<FaSortAmountUp className='ml-1 text-green-400' />
		) : (
			<FaSortAmountDown className='ml-1 text-green-400' />
		)
	}

	const handleFilterChange = (e: { target: { value: any } }) => {
		setFilter(e.target.value)
		setCurrentPage(1)
	}

	const exportToCSV = () => {
		if (!selectedUser || sessions.length === 0) return
		
		const headers = [
			'Date',
			'Activity',
			'Coach',
			'Type',
			'Start Time',
			'End Time'
		]
		const csvContent = [
			headers.join(','),
			...sessions.map(
				(session: {
					date: string | number | Date
					activity: { name: any }
					coach: { name: any }
					sessionType: any
					start_time: any
					end_time: any
				}) =>
					[
						new Date(session.date).toLocaleDateString(),
						session.activity.name,
						session.coach.name,
						session.sessionType,
						session.start_time,
						session.end_time
					].join(',')
			)
		].join('\n')

		const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
		saveAs(blob, `completed_sessions_${selectedUser.label}.csv`)
	}
	

	return (
		<div className='min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 text-white'>
			<AdminNavbarComponent />
			<div className='container mx-auto px-4 py-8'>
				<h1 className='text-4xl font-bold mb-8 text-center'>
					Completed Sessions
				</h1>

				<div className='mb-8'>
					<SearchableSelect
						options={users}
						value={selectedUser}
						onChange={handleUserChange}
						placeholder='Select a user'
					/>
				</div>

				{selectedUser && (
					<>
						<div className='mb-8'>
							{/* First Row - Main Filters */}

							{/* Second Row - Additional Filters */}
							{selectedUser && (
								<div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4'>
									{/* Session Type Filter */}
									<div className='w-full'>
										<select
											value={filter}
											onChange={handleFilterChange}
											className='w-full bg-gray-800 text-white mt-1  px-4 py-3 pb-4 focus:border-green-500 focus:ring-1 focus:ring-green-500 transition-all duration-200 shadow-md'>
											<option value='all'>All Sessions</option>
											<option value='private'>Private Sessions</option>
											<option value='group'>Group Sessions</option>
										</select>
									</div>

									{/* Coach Select */}
									<div className='w-full'>
										<SearchableSelect
											options={coaches}
											value={selectedCoach}
											onChange={handleCoachChange}
											placeholder='Select a coach'
										/>
									</div>

									{/* Activity Select */}
									<div className='w-full'>
										<SearchableSelect
											options={activities}
											value={selectedActivity}
											onChange={handleActivityChange}
											placeholder='Select an activity'
										/>
									</div>

									{/* Date Range and Export Group */}
									<div className='w-full flex flex-col sm:flex-row lg:flex-col gap-4'>
										<DatePicker
											selectsRange={true}
											startDate={startDate}
											endDate={endDate}
											onChange={update => {
												setDateRange(update)
												setCurrentPage(1)
											}}
											className='w-full bg-gray-800 text-white mt-1 px-4 py-3 pb-4 focus:border-green-500 focus:ring-1 focus:ring-green-500 transition-all duration-200 shadow-md '
											placeholderText='Select date range'
										/>

										<motion.button
											onClick={exportToCSV}
											whileHover={{ scale: 1.02 }}
											whileTap={{ scale: 0.98 }}
											className='w-full px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors duration-200 flex items-center justify-center'>
											<FaFileExport className='mr-2' />
											Export to CSV
										</motion.button>
									</div>
								</div>
							)}
						</div>

						{summary && (
							<div className='mb-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4'>
								<div className='bg-gray-800 rounded-lg p-4'>
									<h3 className='text-xl font-bold mb-2'>Total Sessions</h3>
									<p className='text-3xl text-green-500'>
										{summary.totalSessions}
									</p>
								</div>
								<div className='bg-gray-800 rounded-lg p-4'>
									<h3 className='text-xl font-bold mb-2'>Private Sessions</h3>
									<p className='text-3xl text-blue-500'>
										{summary.totalPrivateSessions}
									</p>
								</div>
								<div className='bg-gray-800 rounded-lg p-4'>
									<h3 className='text-xl font-bold mb-2'>Group Sessions</h3>
									<p className='text-3xl text-purple-500'>
										{summary.totalGroupSessions}
									</p>
								</div>
								<div className='bg-gray-800 rounded-lg p-4'>
									<h3 className='text-xl font-bold mb-2'>
										Session Distribution
									</h3>
									<SessionsChart
										privateCount={summary.totalPrivateSessions}
										groupCount={summary.totalGroupSessions}
									/>
								</div>
							</div>
						)}

						{loading ? (
							<div className='flex justify-center items-center h-64'>
								<div className='animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-green-500'></div>
							</div>
						) : (
							<div className='overflow-x-auto'>
								<table className='min-w-full bg-gray-800 rounded-lg overflow-hidden'>
									<thead className='bg-gray-700'>
										<tr>
											<th
												className='px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider cursor-pointer'
												onClick={() => handleSort('date')}>
												<div className='flex items-center'>
													Date
													{sortBy === 'date' &&
														(sortOrder === 'asc' ? (
															<FaSortAmountUp className='ml-1' />
														) : (
															<FaSortAmountDown className='ml-1' />
														))}
												</div>
											</th>
											<th className='px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider'>
												Activity
											</th>
											<th className='px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider'>
												Coach
											</th>
											<th className='px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider'>
												Type
											</th>
											<th className='px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider'>
												Start Time
											</th>
											<th className='px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider'>
												End Time
											</th>
										</tr>
									</thead>
									<tbody className='divide-y divide-gray-700'>
										{sessions.map(
											(session: {
												id: React.Key | null | undefined
												date: string | number | Date
												activity: {
													name:
														| string
														| number
														| boolean
														| React.ReactElement<
																any,
																string | React.JSXElementConstructor<any>
														  >
														| Iterable<React.ReactNode>
														| React.ReactPortal
														| Promise<React.AwaitedReactNode>
														| null
														| undefined
												}
												coach: {
													name:
														| string
														| number
														| boolean
														| React.ReactElement<
																any,
																string | React.JSXElementConstructor<any>
														  >
														| Iterable<React.ReactNode>
														| React.ReactPortal
														| Promise<React.AwaitedReactNode>
														| null
														| undefined
												}
												sessionType:
													| string
													| number
													| boolean
													| React.ReactElement<
															any,
															string | React.JSXElementConstructor<any>
													  >
													| Iterable<React.ReactNode>
													| React.ReactPortal
													| Promise<React.AwaitedReactNode>
													| null
													| undefined
												start_time:
													| string
													| number
													| boolean
													| React.ReactElement<
															any,
															string | React.JSXElementConstructor<any>
													  >
													| Iterable<React.ReactNode>
													| React.ReactPortal
													| Promise<React.AwaitedReactNode>
													| null
													| undefined
												end_time:
													| string
													| number
													| boolean
													| React.ReactElement<
															any,
															string | React.JSXElementConstructor<any>
													  >
													| Iterable<React.ReactNode>
													| React.ReactPortal
													| Promise<React.AwaitedReactNode>
													| null
													| undefined
											}) => (
												<tr
													key={session.id}
													className='hover:bg-gray-700 cursor-pointer'
													onClick={() => setSelectedSession(session)}>
													<td className='px-6 py-4 whitespace-nowrap'>
														{new Date(session.date).toLocaleDateString()}
													</td>
													<td className='px-6 py-4'>{session.activity.name}</td>
													<td className='px-6 py-4'>{session.coach.name}</td>
													<td className='px-6 py-4'>{session.sessionType}</td>
													<td className='px-6 py-4'>{session.start_time}</td>
													<td className='px-6 py-4'>{session.end_time}</td>
												</tr>
											)
										)}
									</tbody>
								</table>
							</div>
						)}

						<div className='mt-4 flex justify-between items-center'>
							<button
								onClick={() =>
									setCurrentPage((prev: number) => Math.max(prev - 1, 1))
								}
								disabled={currentPage === 1}
								className='px-4 py-2 bg-green-600 text-white rounded-md disabled:opacity-50'>
								Previous
							</button>
							<span>
								Page {currentPage} of {totalPages}
							</span>
							<button
								onClick={() =>
									setCurrentPage((prev: number) =>
										Math.min(prev + 1, totalPages)
									)
								}
								disabled={currentPage === totalPages}
								className='px-4 py-2 bg-green-600 text-white rounded-md disabled:opacity-50'>
								Next
							</button>
						</div>
					</>
				)}

				{(!selectedUser || selectedUser===null) && (
					<div className='mb-8'>
						<h2 className='text-2xl font-bold mb-4'>All Users Summary</h2>
						{loading ? (
							<div className='flex justify-center items-center h-64'>
								<div className='animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-green-500'></div>
							</div>
						) : (
							<div className='overflow-x-auto'>
								<table className='min-w-full bg-gray-800 rounded-lg overflow-hidden'>
									<thead className='bg-gray-700'>
										<tr>
											<th 
												className='px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-600 transition-colors duration-200'
												onClick={() => handleSummarySort('user')}>
												<div className='flex items-center select-none'>
													User Name
													{renderSummarySort('user')}
												</div>
											</th>
											<th 
												className='px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-600 transition-colors duration-200'
												onClick={() => handleSummarySort('totalSessions')}>
												<div className='flex items-center select-none'>
													Total Sessions
													{renderSummarySort('totalSessions')}
												</div>
											</th>
											<th 
												className='px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-600 transition-colors duration-200'
												onClick={() => handleSummarySort('totalPrivateSessions')}>
												<div className='flex items-center select-none'>
													Private Sessions
													{renderSummarySort('totalPrivateSessions')}
												</div>
											</th>
											<th 
												className='px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-600 transition-colors duration-200'
												onClick={() => handleSummarySort('totalGroupSessions')}>
												<div className='flex items-center select-none'>
													Group Sessions
													{renderSummarySort('totalGroupSessions')}
												</div>
											</th>
										</tr>
									</thead>
									<tbody className='divide-y divide-gray-700'>
										{sortedSummaries.map((summary, index) => (
											<motion.tr 
												key={index} 
												className='hover:bg-gray-700 transition-colors duration-200'
												initial={{ opacity: 0, y: 10 }}
												animate={{ opacity: 1, y: 0 }}
												transition={{ delay: index * 0.05 }}>
												<td className='px-6 py-4 whitespace-nowrap font-medium'>
													{summary.user}
												</td>
												<td className='px-6 py-4 whitespace-nowrap text-green-500 font-semibold'>
													{summary.totalSessions}
												</td>
												<td className='px-6 py-4 whitespace-nowrap text-blue-500 font-semibold'>
													{summary.totalPrivateSessions}
												</td>
												<td className='px-6 py-4 whitespace-nowrap text-purple-500 font-semibold'>
													{summary.totalGroupSessions}
												</td>
											</motion.tr>
										))}
									</tbody>
								</table>
							</div>
						)}
					</div>
				)}

				{selectedSession && (
					<SessionDetailModal
						session={selectedSession}
						onClose={() => setSelectedSession(null)}
					/>
				)}
			</div>
		</div>
	)
}

export default CompletedSessions