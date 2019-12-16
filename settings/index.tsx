function PureSettings(props: SettingsComponentProps) {
	return (
		<Page>
			<Section
				title={
					<Text bold align="center">
						Time Display
					</Text>
				}
			>
				<Toggle settingsKey="animateSeparator" label="Animate Time Separator" />
				<Toggle settingsKey="showLeadingZero" label="Show Leading Zero" />
				<Toggle settingsKey="showDate" label="Show Date" />
			</Section>
			<Section
				title={
					<Text bold align="center">
						Battery Display
					</Text>
				}
			>
				<Toggle settingsKey="showBatteryPercentage" label="Show Percentage" />
			</Section>
			<Section
				title={
					<Text bold align="center">
						Heart Rate Display
					</Text>
				}
			>
				<Select
					label="Animate Heart Rate"
					settingsKey="animateHeartRate"
					selectViewTitle="Animate Heart Rate"
					options={[
						{
							name: 'No Animation',
							description: '',
							value: 'off'
						},
						{
							name: 'Pulse (regularly)',
							description: 'Always pulses at 60 BPM',
							value: 'interval'
						},
						{
							name: 'Pulse (heart rate)',
							description: 'Pulses with your heart rate. Can affect battery life',
							value: 'pulse'
						}
					]}
					renderItem={option => <TextImageRow label={option.name} sublabel={option.description} />}
				/>
				<Toggle settingsKey="showRestingHeartRate" label="Show Resting Heart Rate" />
			</Section>
			<Button label="Reset All Settings" onClick={() => props.settingsStorage.clear()} />
		</Page>
	);
}

registerSettingsPage(PureSettings);
