const { SlashCommandBuilder } = require('discord.js');
const { ServerQueue, getOrJoinVoiceChannel } = require('../utils');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('join')
    .setDescription('Join voice channel'),
  permissions: [],
  async execute(interaction, { getOrJoinVoiceChannel, queues }) {
    console.log('Executing /join command');
    await interaction.deferReply();
    const guildId = interaction.guildId;
    const member = interaction.member;
    const channel = interaction.channel;

    try {
      const connection = await getOrJoinVoiceChannel(member, guildId, interaction.guild.voiceAdapterCreator);
      if (!queues.has(guildId)) {
        queues.set(guildId, new ServerQueue(connection, channel));
      }
      await interaction.editReply('✅ Joined voice channel!');
    } catch (error) {
      console.error('Error in /join command:', error.message);
      await interaction.editReply(`❌ Error: ${error.message}`);
    }
  },
};