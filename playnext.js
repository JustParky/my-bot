const { createAudioResource, StreamType, AudioPlayerStatus } = require('@discordjs/voice');
const { EmbedBuilder } = require('discord.js');
const { getStream } = require('./utils');

async function playNext(guildId, channel, client, player, queues, history, maxRetries = 3) {
  console.log(`playNext called for guild: ${guildId}`);
  const serverQueue = queues.get(guildId);
  if (!serverQueue) {
    console.warn('⚠️ No server queue found for guild:', guildId);
    return channel.send('❌ No queue found.');
  }
  if (!serverQueue.connection?.state?.status) {
    console.warn('⚠️ Voice connection is invalid or destroyed');
    queues.delete(guildId);
    return channel.send('❌ Lost voice connection. Please use /join to reconnect.');
  }

  const song = serverQueue.songs.shift();
  if (!song) {
    serverQueue.playing = false;
    const randomActivity = client.funnyActivities[Math.floor(Math.random() * client.funnyActivities.length)];
    client.user.setActivity(randomActivity, { type: 'Custom' });
    const embed = new EmbedBuilder()
      .setTitle('Nexus Control Panel')
      .setDescription('No song is currently playing.\nJoin a voice channel and queue songs by name or url using /play.')
      .setColor(0x1db954)
      .setImage('https://i.postimg.cc/y17C26Nd/Chat-GPT-Image-Jul-1-2025-10-41-35-PM.png')
      .setTimestamp();

    if (serverQueue.controllerMessage) {
      try {
        if (!serverQueue.controllerMessage.deleted && serverQueue.controllerMessage.deletable) {
          await serverQueue.controllerMessage.delete();
          serverQueue.controllerMessage = null; // Reset after deletion
        }
      } catch (err) {
        console.error(`Failed to delete controller message for guild ${guildId}: ${err.message}`);
        serverQueue.controllerMessage = null; // Reset on error
      }
    }
    serverQueue.controllerMessage = await channel.send({
      embeds: [embed],
      components: [client.disabledMusicControlsRow1, client.disabledMusicControlsRow2, client.disabledMusicControlsRow3],
    });
    setTimeout(() => {
      if (queues.has(guildId) && !queues.get(guildId).songs.length && !queues.get(guildId).playing) {
        serverQueue.connection.destroy();
        queues.delete(guildId);
        channel.send('👋 Nexus has left the voice channel.');
      }
    }, 5 * 60 * 1000); // 5 minutes
    return;
  }

  let retryCount = 0;
  while (retryCount <= maxRetries) {
    try {
      if (serverQueue.currentSong) {
        if (!history.has(guildId)) history.set(guildId, []);
        history.get(guildId).unshift(serverQueue.currentSong);
        if (history.get(guildId).length > 50) history.get(guildId).pop();
      }
      serverQueue.lastPlayed = serverQueue.currentSong || null;
      serverQueue.currentSong = song;
      serverQueue.isMuted = false;
      serverQueue.previousVolume = serverQueue.volume;

      let stream = song.stream;
      if (!stream || stream.destroyed || !stream.readable) {
        console.log(`Regenerating stream for song: ${song.title}`);
        stream = await getStream(song.url);
      }

      if (serverQueue.loop) {
        serverQueue.songs.push({ ...song, stream: await getStream(song.url) });
      }

      const resource = createAudioResource(stream, {
        inputType: StreamType.Arbitrary,
        inlineVolume: true,
      });
      if (!resource) throw new Error('Failed to create audio resource');
      resource.volume.setVolume(serverQueue.volume);
      player.play(resource);
      serverQueue.connection.subscribe(player);
      serverQueue.playing = true;
      serverQueue.skipVotes.clear();

      client.user.setActivity(song.title, { type: 'Streaming', url: song.url });
      const duration = song.duration ? `${Math.floor(song.duration / 60)}:${(song.duration % 60).toString().padStart(2, '0')}` : 'Unknown';
      const fields = [
        { name: 'Artist', value: song.artist || 'Unknown Artist', inline: true },
        { name: 'Duration', value: duration, inline: true },
        { name: 'Requested by', value: song.requestedBy || 'Unknown', inline: true },
      ];
      if (serverQueue.lastPlayed) {
        fields.push({ name: 'Last Played', value: serverQueue.lastPlayed.title, inline: true });
      }
      const embed = new EmbedBuilder()
        .setTitle('🎶 Now Playing')
        .setDescription(`**${song.title}**`)
        .addFields(fields)
        .setColor(0x1db954)
        .setImage(song.source === 'youtube' ? `https://img.youtube.com/vi/${song.url.match(/(?:v=|\/)([0-9A-Za-z_-]{11})/)?.[1]}/hqdefault.jpg` : null)
        .setTimestamp();

      if (serverQueue.controllerMessage) {
        try {
          if (!serverQueue.controllerMessage.deleted && serverQueue.controllerMessage.deletable) {
            await serverQueue.controllerMessage.delete();
            serverQueue.controllerMessage = null; // Reset after deletion
          }
        } catch (err) {
          console.error(`Failed to delete controller message for guild ${guildId}: ${err.message}`);
          serverQueue.controllerMessage = null; // Reset on error
        }
      }
      serverQueue.controllerMessage = await channel.send({
        embeds: [embed],
        components: [client.musicControlsRow1, client.musicControlsRow2, client.musicControlsRow3],
      });

      return; // Success, exit the retry loop
    } catch (err) {
      console.error(`playNext error (attempt ${retryCount + 1}/${maxRetries}): ${err.message}`);
      retryCount++;
      if (retryCount > maxRetries) {
        await channel.send(`❌ Failed to play **${song.title}** after ${maxRetries} attempts. Skipping...`);
        await playNext(guildId, channel, client, player, queues, history, maxRetries);
        return;
      }
      console.log(`Retrying after 10 seconds...`);
      await new Promise((resolve) => setTimeout(resolve, 10000));
    }
  }
}

module.exports = { playNext };