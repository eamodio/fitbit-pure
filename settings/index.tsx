const colors = [
	{ value: 'fb-white', color: '#FFFFFF' },
	{ value: 'fb-light-gray', color: '#A0A0A0' },
	{ value: 'fb-dark-gray', color: '#505050' },
	{ value: 'fb-cerulean', color: '#8080FF' },
	{ value: 'fb-lavender', color: '#8173FF' },
	{ value: 'fb-indigo', color: '#5B4CFF' },
	{ value: 'fb-purple', color: '#C658FB' },
	{ value: 'fb-plum', color: '#A51E7C' },
	{ value: 'fb-violet', color: '#D828B8' },
	{ value: 'fb-pink', color: '#FF78B7' },
	{ value: 'fb-magenta', color: '#F1247C' },
	{ value: 'fb-red', color: '#FA4D61' },
	{ value: 'fb-orange', color: '#FF752D' },
	{ value: 'fb-peach', color: '#FFCC33' },
	{ value: 'fb-yellow', color: '#F0A500' },
	{ value: 'fb-lime', color: '#72B314' },
	{ value: 'fb-green', color: '#2CB574' },
	{ value: 'fb-mint', color: '#5BE37D' },
	{ value: 'fb-aqua', color: '#3BF7DE' },
	{ value: 'fb-cyan', color: '#15B9ED' },
	{ value: 'fb-slate', color: '#7090B5' },
	{ value: 'fb-blue', color: '#4D86FF' },
];

const backgroundOptions = [
	{ name: 'None', description: '', value: 'none' },
	{ name: 'Arcs', description: '', value: 'lines' },
	{ name: 'Beams', description: '', value: 'beams' },
	{ name: 'Bubbles', description: '', value: 'bubbles' },
	{ name: 'Clouds', description: '', value: 'clouds' },
	{ name: 'Drops', description: '', value: 'drops' },
	{ name: 'Geometric', description: '', value: 'geometric' },
	{ name: 'Glow', description: '', value: 'glow' },
	{ name: 'Oil', description: '', value: 'oil' },
	{ name: 'Rings', description: '', value: 'rings' },
	{ name: 'Smoke', description: '', value: 'smoke' },
	{ name: 'Snake', description: '', value: 'snake' },
	{ name: 'Swirl', description: '', value: 'swirl' },
];

const debug = false;

// eslint-disable-next-line @typescript-eslint/naming-convention
function PureSettings(props: SettingsComponentProps) {
	const donated = props.settings.donated === 'true';
	const autoRotate = props.settings.autoRotate === 'true';

	return (
		<Page>
			<Section
				title={
					<TextImageRow
						label={<Text align="center">Fitbit Pure Clock</Text>}
						sublabel={
							<Text align="center">
								<Link source="https://pure.amod.io">
									<Text bold> pure.amod.io</Text>
								</Link>
							</Text>
						}
					/>
				}
			>
				<Text align="center">
					A beautifully designed, customizable, clean and simple clock face for Fitbit Sense & Versa devices.
				</Text>
			</Section>

			{!donated && (
				<Section
					title={
						<TextImageRow
							label={
								<Text align="center">
									Get the <Text>PRO</Text> Features!
								</Text>
							}
							sublabel={
								<Text align="center">
									Donate for access to all <Text bold>PRO</Text> features
								</Text>
							}
						/>
					}
				>
					<Text align="center">
						<Text bold>PRO</Text> Features
					</Text>
					<TextImageRow
						label="🔒 Activity Stats"
						sublabel="See your steps, distance, active minutes, and calories"
					/>
					<TextImageRow label="🔒 Theming" sublabel="Choose a background and colors that suit your style" />
					<TextImageRow
						label="🔒 On-device Quick Toggles"
						sublabel="Change the look and feel, right on your wrist"
					/>
					<Text>
						Your donation gives you access to all the <Text bold>PRO</Text> features above, and also
						supports this clock face and its on-going development.
					</Text>
					<Text align="center">
						<Link source="https://pure.amod.io">
							Donate at <Text bold>pure.amod.io</Text>
						</Link>
					</Text>
					<Text>
						Once you've donated, tap the <Text bold>&#x2764; Donate</Text> button, on your watch, and enter
						your donation code.
					</Text>
					<Text bold align="center">
						&#x2764; Thank you!
					</Text>
				</Section>
			)}

			<Section
				title={
					<TextImageRow
						label={
							<Text align="center">
								On-device Quick Toggles<Text> (PRO)</Text>
							</Text>
						}
						sublabel={<Text align="center">Quick and easy customizations, right on your wrist</Text>}
					/>
				}
			>
				{!donated && <Text>🔒 Show on Tap &amp; Hold</Text>}
				{donated && <Toggle settingsKey="allowEditing" label="Show on Tap &amp; Hold" />}
			</Section>

			<Section
				title={
					<TextImageRow
						label={
							<Text align="center">
								Theming<Text> (PRO)</Text>
							</Text>
						}
						sublabel={<Text align="center">Choose a background and colors that suit your style</Text>}
					/>
				}
			>
				{!donated && <Text>🔒 Background</Text>}
				{donated && (
					<Select
						label={'Background'}
						selected={[getBackgroundIndex(props.settings.background)]}
						selectViewTitle="Background"
						options={backgroundOptions}
						renderItem={option => <TextImageRow label={option.name} sublabel={option.description} />}
						onSelection={selection =>
							props.settingsStorage.setItem('background', `"${selection.values[0].value}"`)
						}
					/>
				)}
				{!donated && <Text>🔒 Background Brightness</Text>}
				{donated && (
					<Slider
						label={
							<Text>
								Background Brightness:{' '}
								<Text bold>{friendlyOpacity(props.settings.backgroundOpacity)}</Text>
							</Text>
						}
						settingsKey="backgroundOpacity"
						min="0"
						max="100"
						step="5"
					/>
				)}

				<Text>
					{donated ? '' : '🔒 '}Background Color
					{donated && (
						<Text bold>
							<Text>: </Text>
							{friendlyColor(props.settings.accentBackgroundColor)}
						</Text>
					)}
				</Text>
				{donated && <ColorSelect settingsKey="accentBackgroundColor" colors={colors} />}

				<Text>
					{donated ? '' : '🔒 '}Text Accent Color
					{donated && (
						<Text bold>
							<Text>: </Text>
							{friendlyColor(props.settings.accentForegroundColor)}
						</Text>
					)}
				</Text>
				{donated && <ColorSelect settingsKey="accentForegroundColor" colors={colors} />}
			</Section>

			<Section title={<TextImageRow label={<Text align="center">Date &amp; Time Display</Text>} />}>
				<Toggle settingsKey="animateSeparator" label="Animate Time Separator" />
				<Toggle settingsKey="showDate" label="Show Date" />
				<Toggle
					settingsKey="showDayOnDateHide"
					label={
						<Text>
							Show Day <Text italic>(when date is hidden)</Text>
						</Text>
					}
				/>
				<Toggle settingsKey="showLeadingZero" label="Show Leading Zero" />
				<Toggle settingsKey="showSeconds" label="Show Seconds" />
			</Section>

			<Section title={<TextImageRow label={<Text align="center">Battery Display</Text>} />}>
				<Toggle settingsKey="showBatteryPercentage" label="Show Percentage" />
			</Section>

			<Section title={<TextImageRow label={<Text align="center">Heart Rate Display</Text>} />}>
				<Toggle settingsKey="animateHeartRate" label="Animate Heart Rate" />
				{!donated && <Text>🔒 Change Color with Heart Rate</Text>}
				{donated && <Toggle settingsKey="colorizeHeartRate" label="Change Color with Heart Rate" />}
				<Toggle settingsKey="showRestingHeartRate" label="Show Resting Heart Rate" />
			</Section>

			<Section title={<TextImageRow label={<Text align="center">Activity Stats Display (PRO)</Text>} />}>
				{!donated && <Text>🔒 Auto-Rotate Between Date &amp; Stats</Text>}
				{donated && <Toggle settingsKey="autoRotate" label="Auto-Rotate Between Date &amp; Stats" />}
				{donated && autoRotate && (
					<Slider
						label={
							<Text>
								Rotate After: <Text bold>{friendlyInterval(props.settings.autoRotateInterval)}</Text>
							</Text>
						}
						settingsKey="autoRotateInterval"
						min="1000"
						max="5000"
						step="500"
					/>
				)}
				{!donated && <Text>🔒 Show Units</Text>}
				{donated && <Toggle settingsKey="showActivityUnits" label="Show Units" />}
			</Section>

			{isVersa2(props) && (
				<Section title={<TextImageRow label={<Text align="center">Always-on Display</Text>} />}>
					<Toggle settingsKey="aodShowDay" label="Show Day" />
					<Slider
						label={
							<Text>
								Brightness: <Text bold>{friendlyOpacity(props.settings.aodOpacity)}</Text>
							</Text>
						}
						settingsKey="aodOpacity"
						min="30"
						max="100"
						step="10"
					/>
				</Section>
			)}

			<Button
				label="Reset All Settings"
				onClick={() => {
					props.settingsStorage.clear();
					if (donated) {
						props.settingsStorage.setItem('donated', 'true');
					}
				}}
			/>

			{debug && <Toggle settingsKey="donated" label="Donated" />}
		</Page>
	);
}

registerSettingsPage(PureSettings);

function friendlyColor(color: string | undefined) {
	const name = color?.replace(/"/g, '')?.substr(3) ?? '';
	if (!name) return name;

	if (name === 'dark-gray') return 'Dark Gray';
	if (name === 'light-gray') return 'Gray';
	return `${name[0].toUpperCase()}${name.substr(1)}`;
}

function friendlyInterval(value: string | undefined) {
	return Number(value) === 1000 ? '1 second' : `${Number(value) / 1000} seconds`;
}

function friendlyOpacity(value: string | undefined) {
	return `${Number(value ?? 100)}%`;
}

function getBackgroundIndex(value: string | undefined) {
	let count = 0;
	for (const option of backgroundOptions) {
		if (value === `"${option.value}"`) {
			return count;
		}
		count++;
	}

	return 1;
}

function isVersa2(props: SettingsComponentProps) {
	return props.settings.modelName === 'Versa 2';
}
