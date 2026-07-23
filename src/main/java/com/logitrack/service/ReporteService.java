package com.logitrack.service;

import com.logitrack.dto.ResumenReporteDTO;

public interface ReporteService {

    ResumenReporteDTO obtenerResumenGeneral();

    ResumenReporteDTO obtenerResumenGeneral(Integer dias, Integer limit);
}
