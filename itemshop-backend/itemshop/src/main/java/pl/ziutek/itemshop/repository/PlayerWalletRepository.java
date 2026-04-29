package pl.ziutek.itemshop.repository;

import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import pl.ziutek.itemshop.model.PlayerWallet;

import java.util.Optional;

@Repository
public interface PlayerWalletRepository extends JpaRepository<PlayerWallet, Long> {

    Optional<PlayerWallet> findByNicknameIgnoreCase(String nickname);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT w FROM PlayerWallet w WHERE LOWER(w.nickname) = LOWER(:nickname)")
    Optional<PlayerWallet> findByNicknameForUpdate(@Param("nickname") String nickname);
}
