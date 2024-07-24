import { supabaseClient } from '../supabaseClient'

export const addActivity = async activity => {
	const supabase = await supabaseClient()

	// Set group to true if capacity is not null
	if (activity.capacity !== null && activity.capacity !== undefined) {
		activity.group = true
	}

	// Set semi_private based on the new field
	activity.semi_private = activity.semi_private || false

	const { data, error } = await supabase.from('activities').insert([activity])

	if (error) {
		console.error('Error adding new activity:', error.message)
		return null
	}

	return data ? data[0] : null
}

export const updateActivity = async activity => {
	if (!activity.id) throw new Error('Activity ID is required for update.')

	const supabase = await supabaseClient()
	const { data, error } = await supabase
		.from('activities')
		.update(activity)
		.eq('id', activity.id)
	console.log('updates successfully')

	if (error) {
		console.error('Error updating activity:', error.message)
		return null
	}

	return data ? data[0] : null
}

export const deleteActivity = async activityId => {
	const supabase = await supabaseClient()
	const { error } = await supabase
		.from('activities')
		.delete()
		.eq('id', activityId)

	if (error) {
		console.error('Error deleting activity:', error.message)
		return false
	}

	return true
}

export const fetchActivities = async () => {
	const supabase = await supabaseClient()
	const { data, error } = await supabase
		.from('activities')
		.select('*')
		.eq('group', false)

	if (error) {
		console.error('Error fetching private activities:', error.message)
		return []
	}

	return data
}

export const fetchGroupActivities = async () => {
	const supabase = await supabaseClient()
	const { data, error } = await supabase
		.from('activities')
		.select('*')
		.eq('group', true)

	if (error) {
		console.error('Error fetching group activities:', error.message)
		return []
	}

	return data
}

export const fetchTotalActivities = async () => {
	const supabase = await supabaseClient()
	const { count, error } = await supabase
		.from('activities')
		.select('*', { count: 'exact', head: true })

	if (error) {
		console.error('Error fetching total activities:', error.message)
		return 0
	}

	return count || 0
}
