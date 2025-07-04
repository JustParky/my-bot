const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('poll')
    .setDescription('Create a poll')
    .addStringOption(option =>
      option.setName('question')
        .setDescription('Poll question')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('duration')
        .setDescription('Poll duration (e.g., "5 minutes", "2 hours", "1 day")')
        .setRequired(true)
        .addChoices(
          { name: 'Minutes', value: 'minutes' },
          { name: 'Hours', value: 'hours' },
          { name: 'Days', value: 'days' }
        ))
    .addIntegerOption(option =>
      option.setName('duration_value')
        .setDescription('Duration value (e.g., 5 for 5 minutes/hours/days)')
        .setRequired(true)
        .setMinValue(1)),
  permissions: [],
  async execute(interaction) {
    try {
      await interaction.deferReply();
      const question = interaction.options.getString('question');
      const durationUnit = interaction.options.getString('duration');
      const durationValue = interaction.options.getInteger('duration_value');
      
      // Convert duration to milliseconds
      let durationMs;
      if (durationUnit === 'minutes') {
        durationMs = durationValue * 60 * 1000;
      } else if (durationUnit === 'hours') {
        durationMs = durationValue * 60 * 60 * 1000;
      } else if (durationUnit === 'days') {
        durationMs = durationValue * 24 * 60 * 60 * 1000;
      }

      // Format duration for display
      const durationText = `${durationValue} ${durationUnit}`;

      // Define poll buttons
      const pollButtons = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('yes')
          .setLabel('✅ Yes')
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId('no')
          .setLabel('❌ No')
          .setStyle(ButtonStyle.Danger)
      );

      // Random Fallout-themed footer quotes
      const footerQuotes = [
        'Every Polls a goal..',
        'Democracy in the Wasteland!',
        'Powered by Nexus AI.',
      ];
      const randomFooter = footerQuotes[Math.floor(Math.random() * footerQuotes.length)];

      // Track votes and start time
      const votes = { yes: new Set(), no: new Set() };
      const startTime = Date.now();

      // Create initial poll embed
      const embed = new EmbedBuilder()
        .setTitle('📊 Wasteland Poll')
        .setDescription(`\`\`\`**${question}**\`\`\``) // Dark background with bold question
        .addFields({
          name: '🗳️ Current Votes',
          value: `✅ Yes: 0\n❌ No: 0`,
          inline: true
        })
        .setColor(0x00FF00) // Green
        .setImage('https://i.postimg.cc/x9v0vHxd/Chat-GPT-Image-Jul-1-2025-09-31-24-AM.png') // Fallout voting terminal image
        .setFooter({
          text: `${randomFooter} | Poll ends in ${durationText}`,
          iconURL: interaction.client.user.displayAvatarURL()
        })
        .setTimestamp();

      const message = await interaction.editReply({ embeds: [embed], components: [pollButtons] });

      // Update embed every 10 seconds
      const updateInterval = setInterval(async () => {
        try {
          const timeRemainingMs = durationMs - (Date.now() - startTime);
          if (timeRemainingMs <= 0) return; // Stop updating if poll has ended
          const timeRemainingText = formatTimeRemaining(timeRemainingMs);
          const updatedEmbed = new EmbedBuilder()
            .setTitle('📊 Time To Let Your Voice Be Heard!')
            .setDescription(`\`\`\`**${question}**\`\`\``)
            .addFields({
              name: '🗳️ Current Votes',
              value: `✅ Yes: ${votes.yes.size}\n❌ No: ${votes.no.size}`,
              inline: true
            })
            .setColor(0x00FF00)
            .setImage('https://i.postimg.cc/x9v0vHxd/Chat-GPT-Image-Jul-1-2025-09-31-24-AM.png')
            .setFooter({
              text: `${randomFooter} | Poll ends in ${timeRemainingText}`,
              iconURL: interaction.client.user.displayAvatarURL()
            })
            .setTimestamp();
          await message.edit({ embeds: [updatedEmbed], components: [pollButtons] });
        } catch (error) {
          console.error('Error updating poll embed:', error.message);
        }
      }, 10 * 1000);

      // Button collector
      const collector = message.createMessageComponentCollector({ time: durationMs });
      collector.on('collect', async (i) => {
        try {
          await i.deferReply({ flags: 64 }); // Ephemeral reply
          const otherOption = i.customId === 'yes' ? 'no' : 'yes';
          if (votes[otherOption].has(i.user.id)) {
            votes[otherOption].delete(i.user.id); // Remove vote from opposite option
          }
          if (votes[i.customId].has(i.user.id)) {
            await i.editReply({ content: `❌ You already voted ${i.customId === 'yes' ? 'Yes' : 'No'}!`, flags: 64 });
            return;
          }
          votes[i.customId].add(i.user.id);
          const timeRemainingText = formatTimeRemaining(durationMs - (Date.now() - startTime));
          const updatedEmbed = new EmbedBuilder()
            .setTitle('📊 Wasteland Poll')
            .setDescription(`\`\`\`**${question}**\`\`\``)
            .addFields({
              name: '🗳️ Current Votes',
              value: `✅ Yes: ${votes.yes.size}\n❌ No: ${votes.no.size}`,
              inline: true
            })
            .setColor(0x00FF00)
            .setImage('https://i.postimg.cc/x9v0vHxd/Chat-GPT-Image-Jul-1-2025-09-31-24-AM.png')
            .setFooter({
              text: `${randomFooter} | Poll ends in ${timeRemainingText}`,
              iconURL: interaction.client.user.displayAvatarURL()
            })
            .setTimestamp();
          await message.edit({ embeds: [updatedEmbed], components: [pollButtons] });
          await i.editReply({ content: `You voted **${i.customId === 'yes' ? 'Yes' : 'No'}**!`, flags: 64 });
        } catch (error) {
          console.error('Error in poll button interaction:', error.message);
          if (i.isRepliable()) {
            await i.editReply({ content: `❌ Error: ${error.message}`, flags: 64 }).catch(() => {});
          }
        }
      });

      collector.on('end', async () => {
        try {
          clearInterval(updateInterval); // Stop updating
          const resultEmbed = new EmbedBuilder()
            .setTitle('📊 Poll Results')
            .setDescription(`\`\`\`**${question}**\`\`\``)
            .addFields({
              name: '🗳️ Final Votes',
              value: `✅ Yes: ${votes.yes.size}\n❌ No: ${votes.no.size}`,
              inline: true
            })
            .setColor(0x00FF00)
            .setImage('https://i.postimg.cc/x9v0vHxd/Chat-GPT-Image-Jul-1-2025-09-31-24-AM.png')
            .setFooter({
              text: randomFooter,
              iconURL: interaction.client.user.displayAvatarURL()
            })
            .setTimestamp();
          await message.edit({ embeds: [resultEmbed], components: [] });
        } catch (error) {
          console.error('Error in poll end:', error.message);
          await interaction.channel.send({ content: '❌ Failed to display poll results.', flags: 64 }).catch(() => {});
        }
      });
    } catch (error) {
      console.error('Error in /poll command:', error.message);
      const errorEmbed = new EmbedBuilder()
        .setTitle('📊 Let your voice be heard!')
        .setDescription('⚠️ System Error Detected')
        .addFields({ name: '🤖 Error Log', value: `\`\`\`Wasteland glitch! Failed to create poll. Try again, smoothskin.\`\`\`` })
        .setColor(0xFF0000) // Red for errors
        .setImage('https://i.postimg.cc/x9v0vHxd/Chat-GPT-Image-Jul-1-2025-09-31-24-AM.png')
        .setFooter({ text: 'Vault-Tec Voting Terminal', iconURL: interaction.client.user.displayAvatarURL() })
        .setTimestamp();
      await interaction.editReply({ embeds: [errorEmbed] }).catch(err => {
        console.error('Failed to send error reply:', err.message);
      });
    }
  },
};

// Helper function to format time remaining
function formatTimeRemaining(ms) {
  if (ms <= 0) return '0 seconds';
  const days = Math.floor(ms / (24 * 60 * 60 * 1000));
  const hours = Math.floor((ms % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
  const minutes = Math.floor((ms % (60 * 60 * 1000)) / (60 * 1000));
  const seconds = Math.floor((ms % (60 * 1000)) / 1000);
  if (days > 0) return `${days} day${days !== 1 ? 's' : ''}`;
  if (hours > 0) return `${hours} hour${hours !== 1 ? 's' : ''}`;
  if (minutes > 0) return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
  return `${seconds} second${seconds !== 1 ? 's' : ''}`;
}