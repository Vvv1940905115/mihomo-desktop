package system

import (
	"os"

	"github.com/shirou/gopsutil/v3/process"

	"mihomo-client/core/internal/model"
)

// MemoryStat 返回 Core 与 UI 进程的内存占用（字节）。
func MemoryStat(corePID int) model.MemoryStat {
	stat := model.MemoryStat{}

	if corePID > 0 {
		stat.Core = processRSS(int32(corePID))
	}

	// UI 进程：本 sidecar 的父进程（Electron 主进程）。
	if self, err := process.NewProcess(int32(os.Getpid())); err == nil {
		if parent, err := self.Parent(); err == nil {
			stat.UI = processRSS(parent.Pid)
		}
	}

	return stat
}

func processRSS(pid int32) uint64 {
	p, err := process.NewProcess(pid)
	if err != nil {
		return 0
	}
	mem, err := p.MemoryInfo()
	if err != nil {
		return 0
	}
	return mem.RSS
}
