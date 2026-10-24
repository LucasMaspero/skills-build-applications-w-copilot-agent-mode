import { isValidObjectId } from 'mongoose';
import { Activity, Team, User, Workout } from '../models/index.js';

export async function listActivities() {
  return Activity.find().lean();
}

export async function createActivity(input: unknown) {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    throw Object.assign(new Error('Activity must be an object'), { status: 400 });
  }

  const { userId, teamId, type, minutes } = input as Record<string, unknown>;
  if (
    typeof userId !== 'string' || !isValidObjectId(userId) ||
    typeof teamId !== 'string' || !isValidObjectId(teamId) ||
    typeof type !== 'string' || type.trim().length === 0 ||
    typeof minutes !== 'number' || !Number.isFinite(minutes) || minutes <= 0
  ) {
    throw Object.assign(new Error('Invalid activity input'), { status: 400 });
  }

  const [user, team] = await Promise.all([User.exists({ _id: userId }), Team.exists({ _id: teamId })]);
  if (!user || !team) {
    throw Object.assign(new Error('Activity user or team not found'), { status: 404 });
  }

  return Activity.create({
    user: userId,
    team: teamId,
    type: type.trim(),
    minutes,
    points: minutes,
    occurredAt: new Date(),
  });
}

export async function listTeams() {
  return Team.find().lean();
}

export async function createTeam(input: unknown) {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    throw Object.assign(new Error('Team must be an object'), { status: 400 });
  }

  const { name, mascot, members = [] } = input as Record<string, unknown>;
  if (
    typeof name !== 'string' || name.trim().length === 0 ||
    typeof mascot !== 'string' || mascot.trim().length === 0 ||
    !Array.isArray(members) ||
    !members.every((member): member is string => typeof member === 'string' && isValidObjectId(member))
  ) {
    throw Object.assign(new Error('Invalid team input'), { status: 400 });
  }

  const existingMembers = await User.countDocuments({ _id: { $in: members } });
  if (existingMembers !== members.length) {
    throw Object.assign(new Error('One or more team members were not found'), { status: 404 });
  }

  return Team.create({
    name: name.trim(),
    mascot: mascot.trim(),
    members,
  });
}

export async function getLeaderboard() {
  const totals = await Activity.aggregate<{ teamName: string; totalPoints: number }>([
    { $group: { _id: '$team', totalPoints: { $sum: '$points' } } },
    {
      $lookup: {
        from: Team.collection.name,
        localField: '_id',
        foreignField: '_id',
        as: 'team',
      },
    },
    { $unwind: '$team' },
    { $project: { _id: 0, teamName: '$team.name', totalPoints: 1 } },
    { $sort: { totalPoints: -1, teamName: 1 } },
  ]);

  return totals.map((entry, index) => ({ ...entry, rank: index + 1 }));
}

export async function suggestWorkouts(userEmail: string) {
  const user = await User.findOne({ email: userEmail }).lean();
  if (!user) {
    throw Object.assign(new Error('User not found'), { status: 404 });
  }

  const [activity, workouts] = await Promise.all([
    Activity.findOne({ user: user._id }).sort({ occurredAt: -1 }).lean(),
    Workout.find().lean(),
  ]);

  const activityType = activity?.type.trim().toLowerCase();
  const activityFocuses = new Set(
    activityType === 'run' || activityType === 'running' || activityType === 'cycle' || activityType === 'cycling'
      ? ['endurance', activityType]
      : activityType === 'strength' || activityType === 'weightlifting' || activityType === 'weights'
        ? ['strength', activityType]
        : activityType === 'yoga' || activityType === 'stretch' || activityType === 'stretching'
          ? ['mobility', activityType]
          : activityType ? [activityType] : [],
  );
  const fitnessGoal = user.fitnessGoal.trim().toLowerCase();

  return workouts
    .filter((workout) => {
      const focus = workout.focus.trim().toLowerCase();
      return focus === fitnessGoal || activityFocuses.has(focus);
    })
    .sort((first, second) => {
      const firstMatchesGoal = first.focus.trim().toLowerCase() === fitnessGoal;
      const secondMatchesGoal = second.focus.trim().toLowerCase() === fitnessGoal;
      return Number(secondMatchesGoal) - Number(firstMatchesGoal) ||
        (first.title ?? '').localeCompare(second.title ?? '');
    })
    .map((workout) => {
      const matchesGoal = workout.focus.trim().toLowerCase() === fitnessGoal;
      const matchesActivity = activityFocuses.has(workout.focus.trim().toLowerCase());
      const reason = matchesGoal && matchesActivity && activityType
        ? `Matches your ${fitnessGoal} goal and recent ${activityType} activity.`
        : matchesGoal
          ? `Matches your ${fitnessGoal} fitness goal.`
          : `Recommended based on your recent ${activityType} activity.`;

      return { ...workout, reason };
    });
}

export { User };
