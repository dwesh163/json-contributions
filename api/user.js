export default async (req, res) => {
	const username = req.query.username;
	const year = req.query.year || '2023';
	const token = req.query.token;

	if (!username) {
		return res.status(400).json({ error: 'Missing username' });
	}

	if (!token) {
		return res.status(400).json({ error: 'Missing token' });
	}

	try {
		// Utiliser l'importation dynamique pour charger @octokit/graphql
		const { graphql } = await import('@octokit/graphql');

		// Requête GraphQL pour obtenir les contributions sur une période spécifique
		const result = await graphql(
			`
				query ($username: String!, $from: DateTime!, $to: DateTime!) {
					user(login: $username) {
						contributionsCollection(from: $from, to: $to) {
							contributionCalendar {
								weeks {
									contributionDays {
										date
										contributionCount
									}
								}
							}
						}
					}
				}
			`,
			{
				username: username,
				from: `${year}-01-01T00:00:00Z`,
				to: `${year}-12-31T23:59:59Z`,
				headers: {
					authorization: `token ${token}`,
				},
			}
		);

		// Extraire les semaines et jours de contribution
		const weeks = result.user.contributionsCollection.contributionCalendar.weeks;
		let contributions = [];
		let minCount = Infinity;
		let maxCount = 0;

		weeks.forEach((week, i) => {
			let weekData = { week: i, days: [] };

			week.contributionDays.forEach((day) => {
				const count = day.contributionCount;
				if (count < minCount) minCount = count;
				if (count > maxCount) maxCount = count;

				weekData.days.push({
					date: day.date,
					count: count,
				});
			});

			contributions.push(weekData);
		});

		// Retourner les données JSON au client
		res.json({
			username: username,
			year: year,
			min: minCount,
			max: maxCount,
			contributions: contributions,
		});
	} catch (error) {
		console.error(error);
		res.status(500).json({ error: 'Error fetching data from GitHub API' });
	}
};
