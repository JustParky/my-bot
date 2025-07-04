const { SlashCommandBuilder, PermissionsBitField } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('previous')
    .setDescription('Play the previous song from the history'),
  permissions: [],
  async execute(interaction, { queues, history, player }) {
    console.log('Executing /previous command');
    await interaction.deferReply();
    const guildId = interaction.guildId;
    const member = interaction.member;

    try {
      const serverQueue = queues.get(guildId);
      if (!serverQueue || !serverQueue.currentSong) {
        return interaction.editReply('❌ No music is currently playing.');
      }

      if (member.user.id !== serverQueue.currentSong.requestedBy && !member.permissions.has(PermissionsBitField.Flags.ManageGuild)) {
        return interaction.editReply('❌ You cannot play the previous song.');
      }

      const guildHistory = history.get(guildId) || [];
      if (!guildHistory.length) {
        return interaction.editReply('❌ No previous songs in history.');
      }

      const previousSong = guildHistory[0]; // Get the most recent song from history
      serverQueue.songs.unshift(previousSong);
      player.stop();
      await interaction.editReply(`⏮ Replaying previous song: **${previousSong.title}**`);
    } catch (error) {
      console.error('Error in /previous command:', error.message);
      await interaction.editReply(`❌ Error: ${error.message}`);
    }
  },
};