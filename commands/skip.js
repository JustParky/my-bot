const { SlashCommandBuilder, PermissionsBitField } = require('discord.js');
const { ServerQueue } = require('../utils');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('skip')
    .setDescription('Skip the current song'),
  permissions: [],
  async execute(interaction, { queues, player }) {
    console.log('Executing /skip command');
    await interaction.deferReply();
    const guildId = interaction.guildId;
    const member = interaction.member;

    try {
      const serverQueue = queues.get(guildId);
      if (!serverQueue || !serverQueue.currentSong) {
        return interaction.editReply('❌ No music is currently playing.');
      }

      if (member.user.id !== serverQueue.currentSong.requestedBy && !member.permissions.has(PermissionsBitField.Flags.ManageGuild)) {
        return interaction.editReply('❌ You cannot skip this song. Use /vote_skip instead.');
      }

      serverQueue.skipVotes.clear();
      player.stop();
      await interaction.editReply('⏭ Skipped the current song.');
    } catch (error) {
      console.error('Error in /skip command:', error.message);
      await interaction.editReply(`❌ Error: ${error.message}`);
    }
  },
};