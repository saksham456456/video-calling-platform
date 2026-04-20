export const ICE_SERVERS = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };
export class PeerConnection {
  pc: RTCPeerConnection;
  constructor(onTrack: (s: MediaStream) => void, onIceCandidate: (c: RTCIceCandidate) => void) {
    this.pc = new RTCPeerConnection(ICE_SERVERS);
    this.pc.ontrack = (e) => { if (e.streams && e.streams[0]) onTrack(e.streams[0]); };
    this.pc.onicecandidate = (e) => { if (e.candidate) onIceCandidate(e.candidate); };
  }
  async createOffer() { const o = await this.pc.createOffer(); await this.pc.setLocalDescription(o); return o; }
  async createAnswer(o: RTCSessionDescriptionInit) { await this.pc.setRemoteDescription(new RTCSessionDescription(o)); const a = await this.pc.createAnswer(); await this.pc.setLocalDescription(a); return a; }
  async setRemoteDescription(a: RTCSessionDescriptionInit) { if (this.pc.signalingState !== 'stable' || a.type === 'offer') await this.pc.setRemoteDescription(new RTCSessionDescription(a)); }
  async addIceCandidate(c: RTCIceCandidateInit) { try { if (this.pc.remoteDescription) await this.pc.addIceCandidate(new RTCIceCandidate(c)); } catch (e) {} }
  addTrack(s: MediaStream) { s.getTracks().forEach(t => this.pc.addTrack(t, s)); }
  replaceTrack(ot: MediaStreamTrack, nt: MediaStreamTrack) { const s = this.pc.getSenders().find(x => x.track?.kind === nt.kind); if (s) s.replaceTrack(nt); }
  close() { this.pc.close(); }
}
